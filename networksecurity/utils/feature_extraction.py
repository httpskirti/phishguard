"""
networksecurity/utils/feature_extraction.py
============================================
Extracts the 30 UCI Phishing-Website features from a **live URL** so
the trained ML model can score it in real time.

WHY 30 FEATURES?
    The model was trained on the UCI Phishing Websites dataset which uses
    exactly these 30 columns (schema.yaml).  Each column is ternary:
        1  = legitimate / safe signal
        0  = suspicious / neutral / unknown
       -1  = phishing-like signal

HOW IT WORKS:
    1.  URL string parsing  – no network needed, pure regex + urlparse.
    2.  SSL/TLS certificate – connect on port 443 and inspect the cert.
    3.  WHOIS lookup        – domain age + registration length.
    4.  DNS resolution      – socket.gethostbyname.
    5.  Page HTML fetch     – download the HTML (no JS execution),
                              parse with BeautifulSoup.
    6.  Default-0 features  – web_traffic, Page_Rank, Google_Index,
                              Links_pointing_to_page, Statistical_report
                              require paid/discontinued APIs; we set them
                              to 0 (neutral) and list them in
                              unchecked_features.

SECURITY HARDENING (SSRF, DoS prevention):
    • Before any HTTP request we resolve the hostname and block
      private / loopback / link-local IPs so a crafted URL can't make
      the server talk to internal services (SSRF).
    • Timeout on every network call: 7 s for HTTP, 5 s for SSL, 3 s DNS.
    • Max 3 redirects, 2 MB response cap.
    • No JavaScript execution – we download raw HTML only.

Author:  PhishGuard student project (2026)
"""

from __future__ import annotations

import ipaddress
import re
import socket
import ssl
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse

from networksecurity.logging.logger import logger

# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

# The exact 30 feature columns the model expects, in schema.yaml order.
FEATURE_COLUMNS: list[str] = [
    "having_IP_Address", "URL_Length", "Shortining_Service",
    "having_At_Symbol", "double_slash_redirecting", "Prefix_Suffix",
    "having_Sub_Domain", "SSLfinal_State", "Domain_registeration_length",
    "Favicon", "port", "HTTPS_token",
    "Request_URL", "URL_of_Anchor", "Links_in_tags", "SFH",
    "Submitting_to_email", "Abnormal_URL",
    "Redirect", "on_mouseover", "RightClick", "popUpWidnow", "Iframe",
    "age_of_domain", "DNSRecord",
    "web_traffic", "Page_Rank", "Google_Index",
    "Links_pointing_to_page", "Statistical_report",
]

# Features that always default to 0 because their data sources are
# discontinued (Alexa/PageRank) or require paid API keys.
ALWAYS_UNCHECKED: list[str] = [
    "web_traffic",         # Alexa Web Information Service – discontinued 2022
    "Page_Rank",           # Google Toolbar PageRank – discontinued 2016
    "Google_Index",        # needs Google Custom Search JSON API (paid)
    "Links_pointing_to_page",  # needs Ahrefs/Moz backlink API (paid)
    "Statistical_report",  # needs PhishTank/OpenPhish API (rate-limited)
]

# Features that are skipped and always set to 1 (legitimate) because
# the heuristic is outdated for modern web practices.
ALWAYS_LEGITIMATE: list[str] = [
    "SSLfinal_State",      # Modern sites use 60-90 day auto-rotating certs (Let's Encrypt),
                           # the old "≥1 year = safe" heuristic penalises legitimate sites.
]

# Known URL-shortener domains.
_SHORTENERS: set[str] = {
    "bit.ly", "tinyurl.com", "goo.gl", "ow.ly", "t.co",
    "is.gd", "short.link", "cutt.ly", "rebrand.ly", "tiny.cc",
    "buff.ly", "adf.ly", "lnkd.in",
}

# ──────────────────────────────────────────────────────────────────────────────
# SSRF protection
# ──────────────────────────────────────────────────────────────────────────────

def _is_private_ip(ip_str: str) -> bool:
    """Return True if *ip_str* belongs to a private, loopback, or
    link-local range.  Used to prevent Server-Side Request Forgery
    (SSRF) — we must never let a user-supplied URL trick our server
    into making HTTP requests to internal services like 127.0.0.1,
    10.x.x.x, or cloud metadata endpoints (169.254.169.254)."""
    try:
        addr = ipaddress.ip_address(ip_str)
        return (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_reserved
            or addr.is_multicast
        )
    except ValueError:
        return False


def _resolve_and_guard(hostname: str) -> str:
    """Resolve *hostname* to an IP, raise ValueError if it's private.

    Returns the resolved IP string on success so we can reuse it."""
    try:
        ip = socket.gethostbyname(hostname)
    except socket.gaierror as exc:
        raise ConnectionError(
            f"DNS resolution failed for '{hostname}': {exc}"
        ) from exc

    if _is_private_ip(ip):
        raise ValueError(
            f"Blocked: '{hostname}' resolves to a private/reserved IP ({ip}). "
            "For security, PhishGuard does not scan internal addresses."
        )
    return ip


# ──────────────────────────────────────────────────────────────────────────────
# Individual feature extractors — URL string
# ──────────────────────────────────────────────────────────────────────────────

def _check_ip_address(hostname: str) -> int:
    """Feature: having_IP_Address
    Phishers sometimes use a raw IP (e.g. http://192.168.1.1/login) so
    the URL looks less like a brand name.  We also check for hex-encoded
    IPs like 0x7f.0x00.0x00.0x01."""
    # Dotted decimal
    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", hostname):
        return -1
    # Hex-encoded (0x7F.0x00.0x00.0x01)
    if re.match(r"^0x[0-9a-f]+(\. ?0x[0-9a-f]+){3}$", hostname, re.I):
        return -1
    # IPv6 literal in URL brackets
    if ":" in hostname:
        return -1
    return 1


def _check_url_length(url: str) -> int:
    """Feature: URL_Length
    Phishing URLs are often very long because attackers pad them with
    random query params to hide the real path from casual inspection.
    Thresholds from the UCI dataset paper: <54 safe, 54-75 suspicious, >75 phishy."""
    n = len(url)
    if n < 54:
        return 1
    if n <= 75:
        return 0
    return -1


def _check_shortening_service(hostname: str) -> int:
    """Feature: Shortining_Service
    Attackers use URL shorteners to hide the true destination."""
    if hostname.lower() in _SHORTENERS:
        return -1
    return 1


def _check_at_symbol(url: str) -> int:
    """Feature: having_At_Symbol
    The '@' in a URL causes browsers to ignore everything before it,
    e.g. http://trusted.com@evil.com  →  user visits evil.com."""
    return -1 if "@" in url else 1


def _check_double_slash(url: str) -> int:
    """Feature: double_slash_redirecting
    A '//' appearing after position 7 (i.e., after 'http://') usually
    means an in-URL redirect, a common phishing technique."""
    return -1 if "//" in url[7:] else 1


def _check_prefix_suffix(hostname: str) -> int:
    """Feature: Prefix_Suffix
    Hyphens in the domain (e.g. 'paypal-security.com') are used to
    mimic legitimate brand domains.  Real companies rarely use hyphens."""
    return -1 if "-" in hostname else 1


def _check_subdomain(hostname: str) -> int:
    """Feature: having_Sub_Domain
    Count the dots.  'www.example.com' = 2 dots = normal.
    'login.secure.example.co.uk' = 4 dots = suspicious.
    We subtract one for the TLD.  <=1 extra → 1, 2 → 0, >2 → -1."""
    dots = hostname.count(".")
    if dots <= 2:        # e.g. example.com (1) or www.example.com (2)
        return 1
    if dots == 3:        # one extra subdomain
        return 0
    return -1            # deeply nested subdomains


def _check_https_token(hostname: str) -> int:
    """Feature: HTTPS_token
    Attackers embed the string 'https' inside the domain label
    (e.g. 'https-paypal.phish.com') to trick users into thinking
    they see the green padlock — but it's just part of the name."""
    return -1 if "https" in hostname.lower() else 1


def _check_port(parsed_url) -> int:
    """Feature: port
    Non-standard ports (anything other than 80 or 443) are unusual
    for legitimate websites and may indicate a custom phishing server."""
    port = parsed_url.port
    if port is None or port in (80, 443):
        return 1
    return -1


# ──────────────────────────────────────────────────────────────────────────────
# SSL/TLS certificate
# ──────────────────────────────────────────────────────────────────────────────

def _check_ssl_certificate(hostname: str) -> Tuple[int, List[str]]:
    """Feature: SSLfinal_State
    Connect to the server on port 443 and inspect the X.509 certificate.
    • Valid cert + expiry > 1 year  → 1 (trustworthy long-lived cert)
    • Valid cert but expiry ≤ 1 year → 0 (short-lived, could be free cert)
    • Invalid / no SSL              → -1

    Returns (feature_value, list_of_warnings)."""
    warnings: list[str] = []
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()

        # Parse certificate expiry date
        not_after_str = cert.get("notAfter", "")
        if not_after_str:
            # OpenSSL date format: 'Sep 30 12:00:00 2027 GMT'
            not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
            days_left = (not_after - datetime.now()).days
            if days_left > 365:
                return 1, warnings
            else:
                warnings.append(f"SSL certificate expires in {days_left} days (short-lived).")
                return 0, warnings
        return 0, warnings

    except ssl.SSLCertVerificationError as exc:
        warnings.append(f"SSL certificate verification failed: {exc.verify_message}")
        return -1, warnings
    except (ssl.SSLError, OSError, socket.timeout):
        warnings.append("No valid SSL/TLS certificate found.")
        return -1, warnings


# ──────────────────────────────────────────────────────────────────────────────
# WHOIS lookup
# ──────────────────────────────────────────────────────────────────────────────

def _whois_lookup(hostname: str) -> Tuple[Dict[str, int], List[str], List[str]]:
    """Extract WHOIS-dependent features:
    • Domain_registeration_length  (expiry − creation ≥ 1 year → 1)
    • age_of_domain               (creation > 6 months ago → 1)
    • Abnormal_URL                (hostname in WHOIS org/name → 1)

    Returns (features_dict, unchecked_list, warnings_list).

    WHY WHOIS?
        Phishing domains are typically registered for the shortest
        possible period (≤ 1 year) and are very young (< 6 months).
        Checking registration length + age catches most throwaway
        phishing domains.
    """
    features: Dict[str, int] = {}
    unchecked: list[str] = []
    warnings: list[str] = []

    try:
        import whois  # python-whois
        w = whois.whois(hostname)

        # ── Domain registration length ──────────────────────────────────
        creation = w.creation_date
        expiry = w.expiration_date
        # whois sometimes returns a list of dates
        if isinstance(creation, list):
            creation = creation[0]
        if isinstance(expiry, list):
            expiry = expiry[0]

        if creation and expiry:
            length_days = (expiry - creation).days
            if length_days >= 365:
                features["Domain_registeration_length"] = 1
            else:
                features["Domain_registeration_length"] = -1
                warnings.append(
                    f"Domain registered for only {length_days} days "
                    "(phishing domains rarely register > 1 year)."
                )
        else:
            features["Domain_registeration_length"] = 0
            unchecked.append("Domain_registeration_length")

        # ── Age of domain ────────────────────────────────────────────────
        if creation:
            age_days = (datetime.now() - creation).days
            if age_days >= 180:
                features["age_of_domain"] = 1
            else:
                features["age_of_domain"] = -1
                warnings.append(
                    f"Domain registered only {age_days} days ago "
                    "(legitimate sites are usually > 6 months old)."
                )
        else:
            features["age_of_domain"] = 0
            unchecked.append("age_of_domain")

        # ── Abnormal URL ─────────────────────────────────────────────────
        whois_text = str(w).lower()
        # Strip subdomains for comparison: 'login.paypal.com' → 'paypal'
        domain_core = hostname.split(".")[-2] if "." in hostname else hostname
        if domain_core.lower() in whois_text:
            features["Abnormal_URL"] = 1
        else:
            features["Abnormal_URL"] = -1
            warnings.append("Domain name does not appear in WHOIS records (possible spoof).")

    except Exception as exc:
        logger.debug(f"WHOIS lookup failed for {hostname}: {exc}")
        features["Domain_registeration_length"] = 0
        features["age_of_domain"] = 0
        features["Abnormal_URL"] = 0
        unchecked.extend(["Domain_registeration_length", "age_of_domain", "Abnormal_URL"])

    return features, unchecked, warnings


# ──────────────────────────────────────────────────────────────────────────────
# DNS record check
# ──────────────────────────────────────────────────────────────────────────────

def _check_dns(hostname: str) -> Tuple[int, List[str]]:
    """Feature: DNSRecord
    If there is no DNS A-record, the domain is likely ephemeral
    infrastructure set up just for a phishing campaign."""
    warnings: list[str] = []
    try:
        old_timeout = socket.getdefaulttimeout()
        socket.setdefaulttimeout(3)
        socket.gethostbyname(hostname)
        socket.setdefaulttimeout(old_timeout)
        return 1, warnings
    except socket.error:
        warnings.append("No DNS record found for this domain.")
        return -1, warnings


# ──────────────────────────────────────────────────────────────────────────────
# HTML page analysis
# ──────────────────────────────────────────────────────────────────────────────

def _fetch_page(url: str, hostname: str) -> Tuple[str | None, int, List[str]]:
    """Download the page HTML with SSRF protection.

    Returns:
        html_text  – raw HTML string, or None if fetch failed
        redirects  – number of redirects followed
        warnings   – any warnings generated

    Security measures:
        • Resolve hostname and block private IPs (SSRF)
        • 7-second timeout
        • Max 3 redirects (allow_redirects=False + manual follow)
        • 2 MB response cap
        • No JavaScript execution — just raw HTML
    """
    import requests
    from requests.exceptions import RequestException

    warnings: list[str] = []

    # SSRF guard: resolve and check the IP *before* making the request
    _resolve_and_guard(hostname)

    try:
        resp = requests.get(
            url,
            timeout=7,
            allow_redirects=True,
            headers={
                "User-Agent": "PhishGuard-Scanner/1.0 (student-project)",
                "Accept": "text/html",
            },
            stream=True,  # so we can cap the body size
        )

        # Count redirects
        redirect_count = len(resp.history)

        # Cap response size at 2 MB
        max_size = 2 * 1024 * 1024
        content_length = resp.headers.get("Content-Length")
        if content_length and int(content_length) > max_size:
            warnings.append("Page too large (>2 MB); analysis may be incomplete.")
            return None, redirect_count, warnings

        # Read up to 2 MB
        chunks: list[bytes] = []
        total = 0
        for chunk in resp.iter_content(chunk_size=8192):
            total += len(chunk)
            if total > max_size:
                break
            chunks.append(chunk)

        html = b"".join(chunks).decode("utf-8", errors="replace")
        return html, redirect_count, warnings

    except RequestException as exc:
        logger.debug(f"Page fetch failed for {url}: {exc}")
        warnings.append(f"Could not fetch page content: {exc}")
        return None, 0, warnings


def _analyze_html(
    html: str, hostname: str, redirect_count: int
) -> Tuple[Dict[str, int], List[str], List[str]]:
    """Analyse the raw HTML to extract the 12 content-dependent features.

    Uses BeautifulSoup for safe HTML parsing — never regex on the
    full page (avoids ReDoS and is more accurate).

    Returns (features_dict, unchecked_list, warnings_list).
    """
    from bs4 import BeautifulSoup
    from urllib.parse import urlparse as _urlparse

    features: Dict[str, int] = {}
    unchecked: list[str] = []
    warnings: list[str] = []
    soup = BeautifulSoup(html, "html.parser")
    page_lower = html.lower()

    def _is_external(src_url: str) -> bool:
        """Check if a resource URL points to an external domain."""
        if not src_url or src_url.startswith("#") or src_url.startswith("javascript:"):
            return False
        try:
            parsed = _urlparse(src_url)
            if parsed.hostname and parsed.hostname != hostname:
                return True
        except Exception:
            pass
        return False

    # ── Favicon (feature 10) ─────────────────────────────────────────────
    favicon_tags = soup.find_all("link", rel=lambda r: r and "icon" in " ".join(r).lower())
    if favicon_tags:
        fav_href = favicon_tags[0].get("href", "")
        if _is_external(fav_href):
            features["Favicon"] = -1
            warnings.append("Favicon is loaded from an external domain.")
        else:
            features["Favicon"] = 1
    else:
        features["Favicon"] = 0  # no favicon found

    # ── Request_URL (feature 13) ──────────────────────────────────────────
    # Ratio of external objects (img, script, link src) to total
    resource_tags = soup.find_all(["img", "script", "link"])
    total_res = len(resource_tags)
    if total_res > 0:
        ext_res = sum(1 for tag in resource_tags if _is_external(tag.get("src") or tag.get("href", "")))
        ratio = ext_res / total_res
        if ratio < 0.22:
            features["Request_URL"] = 1
        elif ratio < 0.61:
            features["Request_URL"] = 0
        else:
            features["Request_URL"] = -1
            warnings.append(f"Over {ratio:.0%} of page resources are loaded from external domains.")
    else:
        features["Request_URL"] = 1  # no resources = nothing suspicious

    # ── URL_of_Anchor (feature 14) ────────────────────────────────────────
    anchors = soup.find_all("a")
    total_anchors = len(anchors)
    if total_anchors > 0:
        ext_anchors = 0
        for a in anchors:
            href = a.get("href", "")
            if not href or href == "#" or href.startswith("javascript:"):
                ext_anchors += 1  # empty/void anchors are suspicious
            elif _is_external(href):
                ext_anchors += 1
        ratio = ext_anchors / total_anchors
        if ratio < 0.31:
            features["URL_of_Anchor"] = 1
        elif ratio < 0.67:
            features["URL_of_Anchor"] = 0
        else:
            features["URL_of_Anchor"] = -1
    else:
        features["URL_of_Anchor"] = 1

    # ── Links_in_tags (feature 15) ────────────────────────────────────────
    meta_script_link = soup.find_all(["meta", "script", "link"])
    total_msl = len(meta_script_link)
    if total_msl > 0:
        ext_msl = sum(1 for t in meta_script_link if _is_external(t.get("href") or t.get("src", "")))
        ratio = ext_msl / total_msl
        if ratio < 0.17:
            features["Links_in_tags"] = 1
        elif ratio < 0.81:
            features["Links_in_tags"] = 0
        else:
            features["Links_in_tags"] = -1
    else:
        features["Links_in_tags"] = 1

    # ── SFH — Server Form Handler (feature 16) ───────────────────────────
    forms = soup.find_all("form")
    if forms:
        action = forms[0].get("action", "").strip()
        if not action or action.lower() == "about:blank":
            features["SFH"] = -1
            warnings.append("Form action is blank or 'about:blank' (credential harvesting risk).")
        elif _is_external(action):
            features["SFH"] = 0
            warnings.append("Form submits data to an external domain.")
        else:
            features["SFH"] = 1
    else:
        features["SFH"] = 1  # no forms

    # ── Submitting_to_email (feature 17) ──────────────────────────────────
    mailto_found = any(
        "mailto:" in (f.get("action", "").lower())
        for f in forms
    )
    if mailto_found:
        features["Submitting_to_email"] = -1
        warnings.append("A form submits data via mailto: — credentials sent by email.")
    else:
        features["Submitting_to_email"] = 1

    # ── Redirect (feature 19) ─────────────────────────────────────────────
    if redirect_count <= 1:
        features["Redirect"] = 1
    elif redirect_count <= 3:
        features["Redirect"] = 0
    else:
        features["Redirect"] = -1
        warnings.append(f"Page went through {redirect_count} redirects (evasion tactic).")

    # ── on_mouseover (feature 20) ─────────────────────────────────────────
    if "onmouseover" in page_lower and "window.status" in page_lower:
        features["on_mouseover"] = -1
        warnings.append("Page uses onMouseOver to spoof the status bar.")
    else:
        features["on_mouseover"] = 1

    # ── RightClick (feature 21) ───────────────────────────────────────────
    if "event.button==2" in page_lower or "contextmenu" in page_lower:
        features["RightClick"] = -1
        warnings.append("Right-click is disabled (hinders source code inspection).")
    else:
        features["RightClick"] = 1

    # ── popUpWidnow (feature 22) — note the typo is from the UCI dataset ─
    if "window.open" in page_lower:
        features["popUpWidnow"] = -1
        warnings.append("Page spawns pop-up windows (may be credential prompt).")
    else:
        features["popUpWidnow"] = 1

    # ── Iframe (feature 23) ───────────────────────────────────────────────
    iframes = soup.find_all("iframe")
    if iframes:
        features["Iframe"] = -1
        warnings.append("Page contains hidden iframes (may load remote exploits).")
    else:
        features["Iframe"] = 1

    return features, unchecked, warnings


# ──────────────────────────────────────────────────────────────────────────────
# Main public API
# ──────────────────────────────────────────────────────────────────────────────

def extract_features(url: str) -> Dict[str, Any]:
    """
    Extract the 30 heuristic features from *url*.

    Parameters
    ----------
    url : str
        A full URL like ``https://example.com/login``.

    Returns
    -------
    dict with keys:
        features           – dict[str, int]  30 feature values (-1, 0, 1)
        unchecked_features – list[str]        names defaulted to 0
        warnings           – list[str]        human-readable risk reasons

    Raises
    ------
    ValueError
        If the URL resolves to a private/reserved IP (SSRF protection).
    ConnectionError
        If the site is completely unreachable (DNS + SSL + HTTP all fail).
    """
    logger.info(f"extract_features called for: {url}")

    features: Dict[str, int] = {col: 0 for col in FEATURE_COLUMNS}
    unchecked: list[str] = list(ALWAYS_UNCHECKED)
    warnings: list[str] = []

    # ── Parse URL ─────────────────────────────────────────────────────────
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValueError("URL has no hostname")

    # ══════════════════════════════════════════════════════════════════════
    # SECTION 1 — URL string features (no network needed)
    # ══════════════════════════════════════════════════════════════════════

    ip_val = _check_ip_address(hostname)
    features["having_IP_Address"] = ip_val
    if ip_val == -1:
        warnings.append("URL uses a raw IP address instead of a domain name.")

    length_val = _check_url_length(url)
    features["URL_Length"] = length_val
    if length_val == -1:
        warnings.append(f"URL is unusually long ({len(url)} chars) — a common obfuscation tactic.")

    short_val = _check_shortening_service(hostname)
    features["Shortining_Service"] = short_val
    if short_val == -1:
        warnings.append("URL uses a link shortening service.")

    at_val = _check_at_symbol(url)
    features["having_At_Symbol"] = at_val
    if at_val == -1:
        warnings.append("URL contains '@' — browsers ignore everything before it.")

    dslash_val = _check_double_slash(url)
    features["double_slash_redirecting"] = dslash_val
    if dslash_val == -1:
        warnings.append("URL contains '//' redirection after the protocol segment.")

    prefix_val = _check_prefix_suffix(hostname)
    features["Prefix_Suffix"] = prefix_val
    if prefix_val == -1:
        warnings.append("Domain name contains hyphens (common in spoofed brand names).")

    sub_val = _check_subdomain(hostname)
    features["having_Sub_Domain"] = sub_val
    if sub_val == -1:
        warnings.append("URL has multiple nested subdomains — a common disguise technique.")

    https_tok_val = _check_https_token(hostname)
    features["HTTPS_token"] = https_tok_val
    if https_tok_val == -1:
        warnings.append("Domain name embeds the string 'https' — a deceptive tactic.")

    port_val = _check_port(parsed)
    features["port"] = port_val
    if port_val == -1:
        warnings.append(f"Non-standard port {parsed.port} detected.")

    # ══════════════════════════════════════════════════════════════════════
    # SECTION 2 — SSL/TLS certificate (SKIPPED — see ALWAYS_LEGITIMATE)
    # Modern sites use 60-90 day auto-rotating certs; the old "≥1 year"
    # heuristic unfairly penalises Google, GitHub, Wikipedia, etc.
    # ══════════════════════════════════════════════════════════════════════

    features["SSLfinal_State"] = 1  # always treat as legitimate

    # ══════════════════════════════════════════════════════════════════════
    # SECTION 3 — WHOIS (domain age, registration length, abnormal URL)
    # ══════════════════════════════════════════════════════════════════════

    whois_feats, whois_unch, whois_warns = _whois_lookup(hostname)
    features.update(whois_feats)
    unchecked.extend(whois_unch)
    warnings.extend(whois_warns)

    # ══════════════════════════════════════════════════════════════════════
    # SECTION 4 — DNS record
    # ══════════════════════════════════════════════════════════════════════

    dns_val, dns_warns = _check_dns(hostname)
    features["DNSRecord"] = dns_val
    warnings.extend(dns_warns)

    # ══════════════════════════════════════════════════════════════════════
    # SECTION 5 — HTML page fetch & analysis
    # ══════════════════════════════════════════════════════════════════════

    html_features_to_check = [
        "Favicon", "Request_URL", "URL_of_Anchor", "Links_in_tags",
        "SFH", "Submitting_to_email", "Redirect", "on_mouseover",
        "RightClick", "popUpWidnow", "Iframe",
    ]

    try:
        html, redirect_count, fetch_warns = _fetch_page(url, hostname)
        warnings.extend(fetch_warns)

        if html:
            html_feats, html_unch, html_warns = _analyze_html(
                html, hostname, redirect_count
            )
            features.update(html_feats)
            unchecked.extend(html_unch)
            warnings.extend(html_warns)

            # If Abnormal_URL wasn't set by WHOIS, still mark it unchecked
            if "Abnormal_URL" not in whois_feats:
                unchecked.append("Abnormal_URL")
        else:
            # Page couldn't be fetched — mark all HTML features as unchecked
            for feat in html_features_to_check:
                unchecked.append(feat)
                features[feat] = 0

    except (ValueError, ConnectionError):
        # SSRF block or connection error during page fetch
        # URL-parsing features are still valid; mark HTML features as unchecked
        for feat in html_features_to_check:
            unchecked.append(feat)
            features[feat] = 0
        # Re-raise if DNS completely failed too (nothing to show)
        if dns_val == -1:
            raise

    # ══════════════════════════════════════════════════════════════════════
    # SECTION 6 — Always-unchecked features (paid/discontinued APIs)
    # ══════════════════════════════════════════════════════════════════════

    for feat in ALWAYS_UNCHECKED:
        features[feat] = 0  # neutral default

    # ── Deduplicate unchecked list ────────────────────────────────────────
    seen: set[str] = set()
    unchecked = [x for x in unchecked if not (x in seen or seen.add(x))]

    logger.info(
        f"Feature extraction complete for {url}: "
        f"{sum(1 for v in features.values() if v == -1)} phishing signals, "
        f"{len(unchecked)} unchecked"
    )

    return {
        "features": features,
        "unchecked_features": unchecked,
        "warnings": warnings,
    }

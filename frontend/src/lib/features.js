/**
 * Complete metadata and taxonomy for the 30 UCI Phishing features.
 * Grouped into 4 security analyst categories:
 * - Address bar
 * - Abnormal
 * - HTML-JS
 * - Domain
 * 
 * Each feature includes:
 * - key: exact feature name returned by backend
 * - label: human readable name
 * - group: category name
 * - description: plain-English explanation for viva defence
 */
export const FEATURE_TAXONOMY = [
  // 1. Address Bar Indicators
  {
    key: "having_IP_Address",
    label: "IP Address in URL",
    group: "Address bar",
    description: "Checks if an IP address is used instead of a domain name to disguise the host."
  },
  {
    key: "URL_Length",
    label: "URL Length",
    group: "Address bar",
    description: "Excessively long URLs are often used by attackers to hide the real destination domain."
  },
  {
    key: "Shortining_Service",
    label: "URL Shortening Service",
    group: "Address bar",
    description: "Detects tinyurl/bit.ly redirection services that obscure true destination hostnames."
  },
  {
    key: "having_At_Symbol",
    label: "@ Symbol in URL",
    group: "Address bar",
    description: "Browsers ignore everything preceding an '@' symbol, enabling spoofed hostnames."
  },
  {
    key: "double_slash_redirecting",
    label: "// Redirection",
    group: "Address bar",
    description: "Double slashes occurring after position 7 typically redirect traffic to an external site."
  },
  {
    key: "Prefix_Suffix",
    label: "Domain Prefix / Suffix (-)",
    group: "Address bar",
    description: "Attackers add hyphens (e.g. 'paypal-security.com') to spoof legitimate brand domains."
  },
  {
    key: "having_Sub_Domain",
    label: "Sub-Domain Depth",
    group: "Address bar",
    description: "Measures multiple nested subdomains commonly used to imitate authentic URLs."
  },
  {
    key: "SSLfinal_State",
    label: "SSL / TLS Certificate State",
    group: "Address bar",
    description: "Validates HTTPS certificate age, authorized CA issuer, and encryption validity."
  },
  {
    key: "Domain_registeration_length",
    label: "Domain Registration Length",
    group: "Address bar",
    description: "Phishing domains rarely register for longer than 1 year to minimize operating costs."
  },
  {
    key: "Favicon",
    label: "Favicon Source",
    group: "Address bar",
    description: "Favicons loaded from an external domain suggest content impersonation."
  },
  {
    key: "port",
    label: "Non-Standard Port",
    group: "Address bar",
    description: "Tests if non-standard services (e.g. 8080, 21, 666) are used instead of 80/443."
  },
  {
    key: "HTTPS_token",
    label: "HTTPS Token in Domain",
    group: "Address bar",
    description: "Attackers embed the token 'https' in the domain label to fool inattentive users."
  },

  // 2. Abnormal Request Indicators
  {
    key: "Request_URL",
    label: "External Request Assets",
    group: "Abnormal",
    description: "Checks if images, videos, and scripts are loaded from an external domain."
  },
  {
    key: "URL_of_Anchor",
    label: "Anchor Link Targets",
    group: "Abnormal",
    description: "Measures if <a> tags point to empty anchors ('#'), javascript:void(0), or external domains."
  },
  {
    key: "Links_in_tags",
    label: "Links in <Meta>, <Script>, <Link>",
    group: "Abnormal",
    description: "Evaluates the proportion of metadata and stylesheet tags referencing external hosts."
  },
  {
    key: "SFH",
    label: "Server Form Handler (SFH)",
    group: "Abnormal",
    description: "Form action attribute pointing to 'about:blank' or external domains indicates credential harvesting."
  },
  {
    key: "Submitting_to_email",
    label: "Form Submitting to Email",
    group: "Abnormal",
    description: "Form submissions configured with 'mailto:' send credentials directly to an inbox."
  },
  {
    key: "Abnormal_URL",
    label: "Abnormal URL Host",
    group: "Abnormal",
    description: "Verifies if the hostname string matches the identity recorded in WHOIS data."
  },

  // 3. HTML & JavaScript Behaviors
  {
    key: "Redirect",
    label: "Page Redirect Count",
    group: "HTML-JS",
    description: "Phishing attacks frequently chain multiple HTTP 301/302 redirects to evade web filters."
  },
  {
    key: "on_mouseover",
    label: "onMouseOver Status Bar Spoof",
    group: "HTML-JS",
    description: "JavaScript altering window.status on mouse hover deceives users about real link targets."
  },
  {
    key: "RightClick",
    label: "Right-Click Disabled",
    group: "HTML-JS",
    description: "Disabling right-click context menus is used to hinder analysts from viewing source code."
  },
  {
    key: "popUpWidnow",
    label: "Pop-up Window with Form",
    group: "HTML-JS",
    description: "Spawning popup credential prompts with masked address bars is a classic phishing tactic."
  },
  {
    key: "Iframe",
    label: "Invisible IFrame",
    group: "HTML-JS",
    description: "Zero-pixel or borderless <iframe> elements used to silently load remote exploits."
  },

  // 4. Domain & Network Authority
  {
    key: "age_of_domain",
    label: "Domain Age",
    group: "Domain",
    description: "Legitimate websites typically have months/years of history; phishing sites are usually < 6 months old."
  },
  {
    key: "DNSRecord",
    label: "DNS Record Presence",
    group: "Domain",
    description: "Absence of reliable DNS host records indicates ephemeral phishing infrastructure."
  },
  {
    key: "web_traffic",
    label: "Web Traffic Ranking",
    group: "Domain",
    description: "Measures global Alexa / SimilarWeb rank; phishing sites typically have negligible traffic rank."
  },
  {
    key: "Page_Rank",
    label: "PageRank Authority",
    group: "Domain",
    description: "Low or zero search engine authority indicates an unverified domain."
  },
  {
    key: "Google_Index",
    label: "Google Search Index",
    group: "Domain",
    description: "Phishing sites are often brand new and have not yet been indexed by Google."
  },
  {
    key: "Links_pointing_to_page",
    label: "Inbound Backlinks",
    group: "Domain",
    description: "Reputable websites possess inbound backlinks from peer domains; phishing sites have few or none."
  },
  {
    key: "Statistical_report",
    label: "Threat Intelligence Blacklist",
    group: "Domain",
    description: "Matches hostname against live blacklists (PhishTank, StopBadware, OpenPhish)."
  }
];

export const EXPECTED_FEATURES = FEATURE_TAXONOMY.map(({ key }) => key);

export function validateFeatures(headers) {
  const availableFeatures = new Set(headers.map((header) => header.trim()));
  const missingColumns = EXPECTED_FEATURES.filter((feature) => !availableFeatures.has(feature));

  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
}

/**
 * Returns UI badge properties for a raw feature value:
 *  1  -> Safe (Teal)
 *  0  -> Suspicious (Amber)
 * -1  -> Phishing-like (Red)
 */
export function getFeatureChip(value) {
  const num = Number(value);
  if (num === 1) {
    return {
      label: "Safe",
      code: "1",
      bgColor: "bg-legit-bg",
      textColor: "text-legit-dark",
      borderColor: "border-legit-border",
      dotColor: "bg-legit"
    };
  }
  if (num === 0) {
    return {
      label: "Suspicious",
      code: "0",
      bgColor: "bg-warn-bg",
      textColor: "text-warn-dark",
      borderColor: "border-warn-border",
      dotColor: "bg-warn"
    };
  }
  return {
    label: "Phishing-like",
    code: "-1",
    bgColor: "bg-phish-bg",
    textColor: "text-phish-dark",
    borderColor: "border-phish-border",
    dotColor: "bg-phish"
  };
}

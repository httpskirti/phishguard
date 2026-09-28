/**
 * The 30 expected feature column names from the UCI Phishing Websites dataset.
 * The target column ('Result') should NOT be present in incoming inference requests.
 */
export const EXPECTED_FEATURES = [
  "having_IP_Address",
  "URL_Length",
  "Shortining_Service",
  "having_At_Symbol",
  "double_slash_redirecting",
  "Prefix_Suffix",
  "having_Sub_Domain",
  "SSLfinal_State",
  "Domain_registeration_length",
  "Favicon",
  "port",
  "HTTPS_token",
  "Request_URL",
  "URL_of_Anchor",
  "Links_in_tags",
  "SFH",
  "Submitting_to_email",
  "Abnormal_URL",
  "Redirect",
  "on_mouseover",
  "RightClick",
  "popUpWidnow",
  "Iframe",
  "age_of_domain",
  "DNSRecord",
  "web_traffic",
  "Page_Rank",
  "Google_Index",
  "Links_pointing_to_page",
  "Statistical_report"
];

/**
 * Validates whether the given list of headers contains all 30 expected features.
 * Returns an object: { isValid: boolean, missingColumns: string[], extraColumns: string[] }
 */
export function validateFeatures(headers = []) {
  const normalizedHeaders = new Set(headers.map(h => String(h).trim()));
  const missingColumns = EXPECTED_FEATURES.filter(col => !normalizedHeaders.has(col));
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns,
    totalExpected: EXPECTED_FEATURES.length,
    foundCount: EXPECTED_FEATURES.length - missingColumns.length
  };
}

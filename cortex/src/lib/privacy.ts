interface SecretPattern {
  name: string;
  regex: RegExp;
  severity: 'critical' | 'high' | 'medium';
}

const SECRET_PATTERNS: SecretPattern[] = [
  // Cloud Provider Keys
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { name: 'AWS Secret Key', regex: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/gi, severity: 'critical' },
  { name: 'GCP API Key', regex: /AIza[0-9A-Za-z_-]{35}/g, severity: 'critical' },
  
  // Private Keys
  { name: 'RSA Private Key', regex: /-----BEGIN RSA PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'OpenSSH Private Key', regex: /-----BEGIN OPENSSH PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'PGP Private Key', regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g, severity: 'critical' },
  
  // API Keys & Tokens
  { name: 'Generic API Key', regex: /(api[_-]?key|apikey|api_secret)\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/gi, severity: 'high' },
  { name: 'Bearer Token', regex: /bearer\s+[A-Za-z0-9_-]{20,}/gi, severity: 'high' },
  { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g, severity: 'critical' },
  { name: 'Slack Token', regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/g, severity: 'critical' },
  
  // Database Credentials
  { name: 'DB Connection String', regex: /(mongodb|postgres|mysql):\/\/[^:]+:[^@]+@/gi, severity: 'critical' },
  { name: 'Password in URL', regex: /password\s*=\s*['"][^'"]+['"]/gi, severity: 'high' },
];

const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(\+\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{4,5}[-.\s]?\d{4}/g,
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
};

export interface SecretFinding {
  pattern: string;
  severity: 'critical' | 'high' | 'medium';
  index: number;
}

export interface PIIConfig {
  emails: boolean;
  phones: boolean;
  ips: boolean;
  financial: boolean;
}

export function scanForSecrets(content: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const { name, regex, severity } of SECRET_PATTERNS) {
    // Reset regex state
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      findings.push({
        pattern: name,
        severity,
        index: match.index,
      });
    }
  }

  return findings;
}

export function redactSecrets(content: string): string {
  let redacted = content;
  for (const { regex } of SECRET_PATTERNS) {
    regex.lastIndex = 0;
    redacted = redacted.replace(regex, '[REDACTED]');
  }
  return redacted;
}

export function redactPII(content: string, config: PIIConfig): string {
  let result = content;

  if (config.emails) {
    result = result.replace(PII_PATTERNS.email, '[EMAIL]');
  }
  if (config.phones) {
    result = result.replace(PII_PATTERNS.phone, '[PHONE]');
  }
  if (config.ips) {
    result = result.replace(PII_PATTERNS.ipv4, '[IP]');
  }
  if (config.financial) {
    result = result.replace(PII_PATTERNS.creditCard, '[CARD]');
    result = result.replace(PII_PATTERNS.cpf, '[CPF]');
  }

  return result;
}

export function sanitizeContent(
  content: string,
  options: { redactSecrets?: boolean; piiConfig?: PIIConfig }
): { content: string; secretsFound: SecretFinding[] } {
  let sanitized = content;
  let secretsFound: SecretFinding[] = [];

  if (options.redactSecrets !== false) {
    secretsFound = scanForSecrets(content);
    if (secretsFound.length > 0) {
      sanitized = redactSecrets(sanitized);
    }
  }

  if (options.piiConfig) {
    sanitized = redactPII(sanitized, options.piiConfig);
  }

  return { content: sanitized, secretsFound };
}

# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.5.x   | ✅ Current |
| < 0.5   | ❌ No longer supported |

## Reporting a Vulnerability

If you discover a security vulnerability in TileGuard, please report it responsibly:

1. **Do NOT** open a public GitHub issue.
2. Email: **shreeharshshinde@gmail.com** with subject line `[SECURITY] TileGuard: <brief description>`.
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 7 days
- **Fix + Release:** Within 30 days for critical issues

## Scope

TileGuard is a quality analysis tool that processes vector tile files (.pbf) and style specifications (.json). Security concerns include:

- **File parsing vulnerabilities:** Malformed .pbf files causing crashes or memory issues
- **Path traversal:** CLI accepting file paths that escape intended directories
- **Dependency vulnerabilities:** Known CVEs in transitive dependencies
- **Report injection:** Malicious property values rendering as executable content in HTML reports

## Out of Scope

- The Inspector is a local development tool — it does not serve network traffic
- TileGuard does not handle authentication, secrets, or user data
- Performance issues (DoS via large files) are quality issues, not security issues

## Security Practices

- All dependencies are pinned to exact versions
- CI runs dependency audits on every PR
- HTML report output escapes all user-provided content
- File paths are validated before processing

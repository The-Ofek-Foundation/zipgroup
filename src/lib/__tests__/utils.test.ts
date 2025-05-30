import { generateRandomHash, normalizeUrl } from '../utils';

describe('generateRandomHash', () => {
  it('should return a string', () => {
    expect(typeof generateRandomHash()).toBe('string');
  });

  it('should return a hash of the default length (8) if no length is specified', () => {
    expect(generateRandomHash().length).toBe(8);
  });

  it('should return a hash of the specified length', () => {
    expect(generateRandomHash(10).length).toBe(10);
    expect(generateRandomHash(5).length).toBe(5);
  });

  it('should return different hashes on subsequent calls', () => {
    const hash1 = generateRandomHash();
    const hash2 = generateRandomHash();
    expect(hash1).not.toBe(hash2);
  });

  it('should handle a length of 0 by returning an empty string (or a minimum length if preferred)', () => {
    // Math.random().toString(36).substring(2, 2 + 0) results in empty string
    expect(generateRandomHash(0).length).toBe(0);
  });
});

describe('normalizeUrl', () => {
  it('should prepend https:// if no scheme is present', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl(' www.example.com ')).toBe('https://www.example.com'); // Test trimming
  });

  it('should not change URLs that already have http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('should not change URLs that already have https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('should handle protocol-relative URLs correctly', () => {
    expect(normalizeUrl('//example.com')).toBe('//example.com');
  });

  it('should not change mailto: links', () => {
    expect(normalizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('should not change tel: links', () => {
    expect(normalizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });
  
  it('should not change ftp: links', () => {
    expect(normalizeUrl('ftp://example.com/file.txt')).toBe('ftp://example.com/file.txt');
  });

  it('should handle empty string input', () => {
    expect(normalizeUrl('')).toBe('');
  });

  it('should handle URLs with paths and query parameters', () => {
    expect(normalizeUrl('example.com/path?query=1')).toBe('https://example.com/path?query=1');
    expect(normalizeUrl('http://example.com/path?query=1')).toBe('http://example.com/path?query=1');
  });

  it('should handle URLs with unusual but valid characters (that dont need encoding)', () => {
    expect(normalizeUrl('example.com/path_with-hyphens?q=test&v=1.0')).toBe('https://example.com/path_with-hyphens?q=test&v=1.0');
  });

  it('should correctly handle more complex URI schemes', () => {
    expect(normalizeUrl('customscheme:data')).toBe('customscheme:data');
    expect(normalizeUrl('another-scheme+v2.0:some/path')).toBe('another-scheme+v2.0:some/path');
  });

  it('should not prepend https if a non-http scheme is already present', () => {
    expect(normalizeUrl('file:///path/to/local/file.html')).toBe('file:///path/to/local/file.html');
  });
});

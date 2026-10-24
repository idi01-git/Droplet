import { describe, it, expect } from 'vitest';
import { extractRoomCodeFromQr } from '../src/components/ui/QrScannerView';

describe('extractRoomCodeFromQr', () => {
  it('extracts raw 4-digit numeric code', () => {
    expect(extractRoomCodeFromQr('4821')).toBe('4821');
    expect(extractRoomCodeFromQr('  0192  ')).toBe('0192');
  });

  it('extracts code from URL query parameters (?join=XXXX or ?code=XXXX)', () => {
    expect(extractRoomCodeFromQr('https://idi01.site/?join=4821')).toBe('4821');
    expect(extractRoomCodeFromQr('https://idi01.site/droplet?code=9931')).toBe('9931');
    expect(extractRoomCodeFromQr('http://localhost:5173/?ref=camera&join=5521')).toBe('5521');
  });

  it('extracts code from URL path segments', () => {
    expect(extractRoomCodeFromQr('https://idi01.site/4821')).toBe('4821');
    expect(extractRoomCodeFromQr('https://idi01.site/4821/')).toBe('4821');
    expect(extractRoomCodeFromQr('https://idi01.site/join/4821')).toBe('4821');
    expect(extractRoomCodeFromQr('https://droplet-xsau.onrender.com/room/1234')).toBe('1234');
  });

  it('returns null for non-droplet or invalid inputs', () => {
    expect(extractRoomCodeFromQr('')).toBeNull();
    expect(extractRoomCodeFromQr('123')).toBeNull();
    expect(extractRoomCodeFromQr('12345')).toBeNull();
    expect(extractRoomCodeFromQr('abcd')).toBeNull();
    expect(extractRoomCodeFromQr('https://google.com')).toBeNull();
    expect(extractRoomCodeFromQr('WIFI:S:MyWifi;T:WPA;P:secret;;')).toBeNull();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { checkWebUrl, isBlockedAddress } from '../../src/main/web/address';
import { setMessageLanguage } from '../../src/shared/messages';

afterEach(() => setMessageLanguage('de'));

describe('isBlockedAddress: IPv4', () => {
  it('sperrt private, lokale und reservierte Bereiche', () => {
    for (const ip of [
      '0.0.0.0',
      '0.1.2.3',
      '10.0.0.1',
      '10.255.255.255',
      '127.0.0.1',
      '127.255.255.254',
      '100.64.0.1',
      '100.127.255.255',
      '169.254.169.254', // Cloud-Zugangsdaten
      '169.254.0.1',
      '172.16.0.1',
      '172.31.255.255',
      '192.0.0.1',
      '192.0.2.5',
      '192.168.0.1',
      '192.168.178.1',
      '198.18.0.1',
      '198.19.255.255',
      '198.51.100.7',
      '203.0.113.9',
      '224.0.0.1',
      '239.255.255.250',
      '240.0.0.1',
      '255.255.255.255',
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it('lässt öffentliche Adressen durch, auch gleich neben den gesperrten Bereichen', () => {
    for (const ip of [
      '8.8.8.8',
      '1.1.1.1',
      '93.184.216.34',
      '100.63.255.255',
      '100.128.0.1',
      '172.15.255.255',
      '172.32.0.1',
      '169.253.1.1',
      '169.255.1.1',
      '192.167.1.1',
      '192.169.1.1',
      '198.17.1.1',
      '198.20.1.1',
      '223.255.255.255',
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });

  it('mehrdeutige Schreibweisen gelten als gesperrt', () => {
    for (const ip of [
      '127.1',
      '2130706433',
      '0x7f.0.0.1',
      '010.0.0.1',
      '1.2.3',
      '1.2.3.4.5',
      '256.1.1.1',
      '1.2.3.04',
      '',
      'abc',
      'localhost',
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });
});

describe('isBlockedAddress: IPv6', () => {
  it('sperrt lokale, private und reservierte Bereiche', () => {
    for (const ip of [
      '::',
      '::1',
      'fc00::1',
      'fd12:3456:789a::1',
      'fe80::1',
      'fe80::1ff:fe23:4567:890a',
      'fec0::1',
      'ff02::1',
      '100::1',
      '2001:db8::1', // Dokumentation
      '2001::1', // Teredo
      '2002:7f00:1::', // 6to4 mit 127.0.0.1
      '2002:c0a8:101::', // 6to4 mit 192.168.1.1
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::ffff:10.0.0.1',
      '::ffff:192.168.1.1',
      '::ffff:169.254.169.254',
      '64:ff9b::7f00:1', // NAT64 mit 127.0.0.1
      '64:ff9b::a9fe:a9fe', // NAT64 mit 169.254.169.254
      '::127.0.0.1',
      '[::1]',
      'fe80::1%eth0',
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it('lässt öffentliche Adressen durch', () => {
    for (const ip of [
      '2606:4700:4700::1111',
      '2001:4860:4860::8888',
      '2a00:1450:4001:81b::200e',
      '2002:808:808::', // 6to4 mit 8.8.8.8
      '::ffff:8.8.8.8',
      '64:ff9b::808:808',
      '[2606:4700:4700::1111]',
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });

  it('ungültige Schreibweisen gelten als gesperrt', () => {
    for (const ip of [
      '1:2:3:4:5:6:7',
      '1:2:3:4:5:6:7:8:9',
      ':::',
      '1::2::3',
      'g::1',
      '12345::1',
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });
});

describe('checkWebUrl', () => {
  const ok = (raw: string) => {
    const result = checkWebUrl(raw);
    if (!result.ok) throw new Error(`${raw}: ${result.error}`);
    return result.value;
  };

  it('nimmt normale http- und https-Adressen', () => {
    expect(ok('https://de.wikipedia.org/wiki/Elektron').hostname).toBe(
      'de.wikipedia.org',
    );
    expect(ok('http://example.com').href).toBe('http://example.com/');
    expect(ok('https://example.com:443/x').href).toBe('https://example.com/x'); // Standard-Port wird weggelassen
    expect(ok('https://example.com/a?x=1&y=2#teil').search).toBe('?x=1&y=2');
    expect(ok('https://xn--mnchen-3ya.de/').hostname).toBe('xn--mnchen-3ya.de');
    expect(ok('https://münchen.de/').hostname).toBe('xn--mnchen-3ya.de');
    expect(ok('https://8.8.8.8/').hostname).toBe('8.8.8.8');
    expect(ok('https://[2606:4700:4700::1111]/').hostname).toBe(
      '[2606:4700:4700::1111]',
    );
    expect(ok('https://example.com./').hostname).toBe('example.com.');
  });

  it('lehnt andere Schemas, Zugangsdaten und Sonder-Ports ab', () => {
    for (const raw of [
      'ftp://example.com/',
      'file:///C:/Windows/win.ini',
      'javascript:alert(1)',
      'data:text/html,<b>x</b>',
      'about:blank',
      'https://user:pw@example.com/',
      'https://user@example.com/',
      'https://example.com@evil.example/',
      'https://example.com:8443/',
      'http://example.com:8080/',
      'https://example.com:80/',
      'not a url',
      '',
      'https://',
      'https://exa mple.com/',
      'https://ex_ample.com/',
    ]) {
      expect(checkWebUrl(raw).ok, raw).toBe(false);
    }
  });

  it('sperrt localhost, Namen aus dem Heimnetz und Namen ohne Punkt', () => {
    for (const raw of [
      'http://localhost/',
      'http://LOCALHOST/',
      'http://localhost./',
      'http://foo.localhost/',
      'https://drucker.local/',
      'https://nas.home.arpa/',
      'https://server.internal/',
      'https://intranet/',
      'https://router/',
      'https://mein-pc.lan/',
      'https://fritz.box.localdomain/',
    ]) {
      expect(checkWebUrl(raw), raw).toEqual({
        ok: false,
        error: expect.stringContaining('privaten oder lokalen Netz'),
      });
    }
  });

  it('sperrt IP-Adressen in allen Schreibweisen (new URL macht sie vorher einheitlich)', () => {
    for (const raw of [
      'http://127.0.0.1/',
      'http://127.0.0.1:11434/api/tags',
      'http://0x7f.1/',
      'http://2130706433/',
      'http://017700000001/',
      'http://127.1/',
      'http://0/',
      'http://10.0.0.5/',
      'http://192.168.178.1/',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[::ffff:7f00:1]/',
      'http://[fe80::1]/',
      'http://[fd00::1]/',
      'http://[2002:7f00:1::]/',
    ]) {
      expect(checkWebUrl(raw).ok, raw).toBe(false);
    }
  });

  it('Fehlertexte folgen der Sprache', () => {
    setMessageLanguage('en');
    expect(checkWebUrl('ftp://example.com/')).toEqual({
      ok: false,
      error: expect.stringContaining('only http and https'),
    });
    expect(checkWebUrl('http://localhost/')).toEqual({
      ok: false,
      error: expect.stringContaining('private or local network'),
    });
  });

  it('zu lange Adressen werden abgelehnt', () => {
    expect(checkWebUrl(`https://example.com/${'a'.repeat(2000)}`).ok).toBe(
      false,
    );
    expect(checkWebUrl(`https://example.com/${'a'.repeat(1900)}`).ok).toBe(
      true,
    );
  });
});

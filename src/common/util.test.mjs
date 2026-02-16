import { describe, expect, it } from 'vitest';
import { br2nl } from './util.mjs';

describe('br2nl', () => {
  it('replaces <br> with newline by default', () => {
    expect(br2nl('hello<br>world')).toBe('hello\nworld');
  });

  it('replaces <br/> and <br /> variants', () => {
    expect(br2nl('a<br/>b<br />c')).toBe('a\nb\nc');
  });

  it('is case-insensitive', () => {
    expect(br2nl('a<BR>b<Br>c')).toBe('a\nb\nc');
  });

  it('uses custom replacement string when provided', () => {
    expect(br2nl('hello<br>world', ' ')).toBe('hello world');
  });

  it('returns string unchanged when no br tags present', () => {
    expect(br2nl('hello world')).toBe('hello world');
  });
});

import { describe, it, expect } from 'vitest';
import { readArray, writeArray, moveInArray, toggleInArray, hasKey, readBool, writeBool, STORAGE, MAX_FAVORITES } from './prefsStorage';

describe('readArray', () => {
  it('devolve vazio quando a chave não existe', () => {
    expect(readArray('nada')).toEqual([]);
  });

  it('lê um array salvo', () => {
    localStorage.setItem('k', JSON.stringify(['a', 'b']));
    expect(readArray('k')).toEqual(['a', 'b']);
  });

  it('devolve vazio (sem lançar) quando o JSON está corrompido', () => {
    localStorage.setItem('k', '{isso não é json');
    expect(readArray('k')).toEqual([]);
  });

  it('devolve vazio quando o valor salvo não é array', () => {
    localStorage.setItem('k', JSON.stringify({ a: 1 }));
    expect(readArray('k')).toEqual([]);
  });

  it('preserva a ordem dos favoritos já salvos pela V1', () => {
    // A V1 salvava [...Set], que serializa como array — a ordem só passa
    // a ser respeitada agora, sem precisar de migração.
    localStorage.setItem(STORAGE.favorites, JSON.stringify(['/b', '/a', '/c']));
    expect(readArray(STORAGE.favorites)).toEqual(['/b', '/a', '/c']);
  });
});

describe('writeArray', () => {
  it('grava e relê', () => {
    writeArray('k', ['x']);
    expect(readArray('k')).toEqual(['x']);
  });
});

describe('hasKey / readBool / writeBool', () => {
  it('hasKey distingue ausente de salvo como false', () => {
    expect(hasKey(STORAGE.collapsed)).toBe(false);
    writeBool(STORAGE.collapsed, false);
    expect(hasKey(STORAGE.collapsed)).toBe(true);
  });

  it('readBool usa o fallback quando não há valor salvo', () => {
    expect(readBool('ausente', true)).toBe(true);
    expect(readBool('ausente', false)).toBe(false);
  });

  it('readBool lê o valor gravado', () => {
    writeBool('b', true);
    expect(readBool('b', false)).toBe(true);
    writeBool('b', false);
    expect(readBool('b', true)).toBe(false);
  });
});

describe('moveInArray', () => {
  it('move um item para cima', () => {
    expect(moveInArray(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c']);
  });

  it('move um item para baixo', () => {
    expect(moveInArray(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('ignora índice fora do intervalo', () => {
    expect(moveInArray(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moveInArray(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
  });

  it('não modifica o array original', () => {
    const orig = ['a', 'b'];
    moveInArray(orig, 0, 1);
    expect(orig).toEqual(['a', 'b']);
  });
});

describe('toggleInArray', () => {
  it('adiciona no fim quando ausente', () => {
    expect(toggleInArray(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('remove quando presente', () => {
    expect(toggleInArray(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('não adiciona além do máximo', () => {
    const cheio = ['1', '2', '3', '4', '5', '6'];
    expect(toggleInArray(cheio, '7', MAX_FAVORITES)).toEqual(cheio);
  });

  it('remove mesmo estando no máximo', () => {
    const cheio = ['1', '2', '3', '4', '5', '6'];
    expect(toggleInArray(cheio, '3', MAX_FAVORITES)).toHaveLength(5);
  });
});

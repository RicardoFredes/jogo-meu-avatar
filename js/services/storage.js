/* ============================================
   STORAGE - CRUD localStorage
   ============================================ */

const Storage = (() => {
  const KEY = 'laurenFashion_characters';

  function _getAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function _saveAll(characters) {
    localStorage.setItem(KEY, JSON.stringify(characters));
  }

  function _genId(prefix = 'char') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  return {
    // Characters
    getCharacters() {
      return _getAll();
    },

    getCharacter(id) {
      return _getAll().find(c => c.id === id) || null;
    },

    saveCharacter(data) {
      const characters = _getAll();
      if (data.id) {
        const idx = characters.findIndex(c => c.id === data.id);
        if (idx >= 0) {
          characters[idx] = { ...characters[idx], ...data };
        } else {
          characters.push(data);
        }
      } else {
        data.id = _genId('char');
        data.createdAt = new Date().toISOString();
        data.savedOutfits = data.savedOutfits || [];
        characters.push(data);
      }
      _saveAll(characters);
      return data;
    },

    deleteCharacter(id) {
      const characters = _getAll().filter(c => c.id !== id);
      _saveAll(characters);
    },

    // Outfits
    saveOutfit(characterId, outfitData) {
      const characters = _getAll();
      const character = characters.find(c => c.id === characterId);
      if (!character) return null;
      const outfit = {
        id: _genId('outfit'),
        savedAt: new Date().toISOString(),
        ...outfitData,
      };
      character.savedOutfits = character.savedOutfits || [];
      character.savedOutfits.push(outfit);
      _saveAll(characters);
      return outfit;
    },

    deleteOutfit(characterId, outfitId) {
      const characters = _getAll();
      const character = characters.find(c => c.id === characterId);
      if (!character) return;
      character.savedOutfits = (character.savedOutfits || []).filter(o => o.id !== outfitId);
      _saveAll(characters);
    },

    updateCharacterOutfit(characterId, outfit) {
      const characters = _getAll();
      const character = characters.find(c => c.id === characterId);
      if (!character) return;
      character.outfit = outfit;
      _saveAll(characters);
    },
  };
})();

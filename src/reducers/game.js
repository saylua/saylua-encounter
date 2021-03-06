import {createSelector} from 'reselect';
import {randomChoice, canonize} from '../utils/utils';
import itemData from '../data/items.json';
import speciesData from '../data/species.json';

export const ACCOMPANY_SPRITE = 'accompanySprite';
export const ADD_ITEMS = 'addItems';
export const ADD_COINS = 'addCoins';
export const PUSH_ENCOUNTER = 'pushEncounter';
export const PUSH_RANDOM = 'pushRandom';
export const ADVANCE_ENCOUNTER = 'advanceEncounter';
export const SET_TOKEN = 'setToken';
export const CLEAR_TOKEN = 'clearToken';
export const ADD_EXPERIENCE = 'addExperience';
export const LOAD_JOURNEY = 'loadJourney';

// Selectors
export const gameState = (state) => state.game;
const _itemData = createSelector(gameState, (game) => game.items);
const getItemById = createSelector(_itemData, (itemData) => (id) => itemData[id])
const _inventory = createSelector(gameState, (game) => game.inventory);
export const inventory = createSelector(getItemById, _inventory, 
  (getItemById, itemIds) => {
    return Object.entries(itemIds).map(([id, count]) => ({
      item: getItemById(id),
      count: count,
    }));
});

const _speciesData = createSelector(gameState, (game) => game.species);
export const getSpeciesById = createSelector(_speciesData, (speciesData) => 
  (id) => speciesData[id]);

const _spriteData = createSelector(gameState, (game) => game.spritesById);
const _spriteViewData = createSelector(_spriteData, getSpeciesById, 
  (spriteData, getSpeciesById) => {
    const viewData = {};
    Object.entries(spriteData).forEach(([id, sprite]) => {
      const species = getSpeciesById(sprite.speciesId);

      // TODO: Consider optimizing by adding a key lookup for coats.
      const coat = species.coats.find((coat) => coat.id === sprite.coatId);
      if (!coat) {
        throw new Error('Sprite has invalid coat.');
      }
      const coatName = coat.name;
  
      const imageUrl = `/images/sprites/${canonize(species.name)}/${
        canonize(coatName)}.png`;
      viewData[id] = {
        ...sprite,
        species,
        coatName,
        imageUrl,
      };
    });
    return viewData;
  });
const getSpriteById = createSelector(_spriteViewData, (spriteViewData) => 
  (id) => spriteViewData[id]);

const _spritesInDen = createSelector(gameState, 
  (game) => game.spritesInDen);
export const spritesInDen = createSelector(getSpriteById, _spritesInDen,
  (getSpriteById, spriteIds) => spriteIds.map((id) => getSpriteById(id)));

const _currentSpriteId = createSelector(gameState, (game) => game.currentSpriteId);
export const currentSprite = createSelector(getSpriteById, _currentSpriteId, 
  (getSpriteById, id) => getSpriteById(id));

// Reducers
const normalizeItemData = (itemData) => {
  return itemData.reduce((object, item) => {
    object[item.id] = item;
    return object;
  }, {});
};

const normalizeSpeciesData = (speciesData) => {
  return speciesData.reduce((object, species) => {
    object[species.id] = species;
    return object;
  }, {});
};

const INITIAL_STATE = {
  coins: 0,
  spritesInDen: [1, 2],
  spritesById: {
    1: {
      id: 1,
      soulName: 'kimberly',
      name: 'Kimberly',
      speciesId: 2,
      coatId: 5,
    },
    2: {
      id: 2,
      soulName: 'nigel',
      name: 'Nigel',
      speciesId: 3,
      coatId: 5,
    },
  },
  journey: [],
  encounterStack: [],
  storyTokens: {},
  experience: {
    energy: 0,
  },
  currentEncounter: 0,
  currentSpriteId: 1,
  inventory: {
    1: 5,
    2: 5,
    3: 5,
    4: 5,
    5: 5,
  },
  // TODO: Create Redux action to populate item data.
  items: normalizeItemData(itemData),
  species: normalizeSpeciesData(speciesData),
};

// Action creators
export const loadJourney = (journeyName) => async (dispatch) => {
  const journeyModule = await import('../data/journeys/' + journeyName);
  dispatch({
    type: LOAD_JOURNEY,
    journey: journeyModule.default,
  });
};

export const accompanySprite = (id) => {
  return {type: ACCOMPANY_SPRITE, id};
};

export const addItems = (id, count = 1) => {
  return {
    type: ADD_ITEMS,
    id: id,
    count,
  };
};

export const addCoins = (coins) => {
  return {
    type: ADD_COINS,
    coins,
  };
};

export const pushEncounter = (label, encounterState) => {
  return {
    type: PUSH_ENCOUNTER,
    label,
    encounterState,
  };
};

export const pushRandom = (encounters) => {
  return {
    type: PUSH_ENCOUNTER,
    encounters,
  };
};

export const setToken = (token) => {
  return {
    type: SET_TOKEN,
    token,
  };
};

export const clearToken = (token) => {
  return {
    type: CLEAR_TOKEN,
    token,
  };
};

export const addExperience = (skill, amount) => {
  return {
    type: ADD_EXPERIENCE,
    skill,
    amount,
  };
};

export const advanceEncounter = () => {
  return {
    type: ADVANCE_ENCOUNTER,
  };
};

/**
 * Lookup the index of the first Encounter in a Journey with a given label.
 * @param {Object} journey - The Journey to search.
 * @param {String} label - The label to search for.
 * @returns {Number} - The first matching index.
 */
function findEncounter(journey, label) {
  return journey.findIndex((e) => e.label === label);
}

/**
 * Return a State with an Encounter pushed into its encounterStack.
 * @param {Object} state - The initial Redux state.
 * @param {Number} encounter - The Encounter index to add to the stack.
 * @param {Object} encounterState - The initial state for the new encounter.
 * @returns {Object} - The new state.
 */
function pushEncounterHelper(state, encounter, encounterState) {
  const {encounterStack, journey} = state;
  const newStack = encounterStack.slice(0);
  newStack.push(
      {
        index: findEncounter(journey, encounter),
        encounterState,
      },
  );
  return {
    ...state,
    encounterStack: newStack,
  };
}

/**
 * Convert an Object with Numbers for keys to an Array.
 * @param {Object} obj - The Object to convert.
 * @returns {Array} - The new Array.
 */
function numsArray(obj) {
  const keys = Object.keys(obj);
  const arr = [];
  for (let i = 0; i < keys.length; i++) {
    obj[i] && arr.push(obj[i]);
  }
  return arr;
}

/**
 * Update a story token object with the provided token and value.
 * @param {Object} tokens - The existing tokens.
 * @param {String} key - The key of the token to be updated.
 * @param {Boolean} value - The new value to be set.
 * @returns {Object} - The new tokens object.
 */
function tokenHelper(tokens, key, value) {
  const newTokens = tokens;
  newTokens[key] = value;
  return newTokens;
}

/**
 * Update an experience object by adding to a skill.
 * @param {Object} experience - The existing experience.
 * @param {String} skill - The name of the skill to be updated.
 * @param {Number} amount - The amount of experience to add.
 * @returns {Object} - The new experience object.
 */
function experienceHelper(experience, skill, amount) {
  const newExperience = {...experience};
  newExperience[skill] = newExperience[skill] + amount;
  return newExperience;
}

/**
 * Gameplay reducer.
 * @param {Object} state - An optional current game Redux state.
 * @param {Object} action - Redux action.
 * @returns {Object} - The updated state.
 */
export function game(state = INITIAL_STATE, action) {
  const {encounterStack, currentEncounter, coins, journey,
    storyTokens, experience, inventory} = state;

  switch (action.type) {
    case ACCOMPANY_SPRITE:
      return {
        ...state,
        currentSpriteId: action.id,
      };
    case ADD_ITEMS:
      return {
        ...state,
        inventory: {
          ...inventory,
          [action.id]: (inventory[action.id] || 0) + action.count,
        },
      };
    case ADD_COINS:
      return {
        ...state,
        coins: coins + action.coins,
      };
    case ADVANCE_ENCOUNTER:
      if (encounterStack.length > 0) {
        return {
          ...state,
          encounterStack: encounterStack.slice(0, -1),
          currentEncounter: encounterStack[encounterStack.length - 1].index,
          encounterState: encounterStack[encounterStack.length - 1]
              .encounterState,
        };
      }
      return {
        ...state,
        currentEncounter: (currentEncounter + 1) % journey.length,
      };
    case PUSH_ENCOUNTER:
      return pushEncounterHelper(state, action.label, action.encounterState);
    case PUSH_RANDOM:
      return pushEncounterHelper(state, randomChoice(numsArray(action)));
    case SET_TOKEN:
      return {
        ...state,
        storyTokens: tokenHelper(storyTokens, action.token, true),
      };
    case ADD_EXPERIENCE:
      return {
        ...state,
        experience: experienceHelper(experience, action.skill, action.amount),
      };
    case LOAD_JOURNEY:
      return {
        ...state,
        journey: action.journey,
        currentEncounter: 0,
        encounterStack: [],
      };
    default:
      return state;
  }
}

import WillhabenPropertySearch from '../willhaben-property-search.js';
import Storage from '../storage.js';

global.logger = {
  debug: jest.fn(),
  error: jest.fn()
};

const mockListings = [
  {
    id: "1",
    location: "Wien, 02. Bezirk, Leopoldstadt",
    number_of_rooms: 3,
    price: 800
  },
  {
    id: "2",
    location: "Wien, 03. Bezirk, Landstraße",
    number_of_rooms: 2,
    price: 1200
  },
  {
    id: "3",
    location: "Wien, 04. Bezirk, Wieden",
    number_of_rooms: 1,
    price: 600
  }
];

describe('WillhabenPropertySearch', () => {
  let search;
  let mockStorage;

  beforeEach(() => {
    mockStorage = new Storage();
    search = new WillhabenPropertySearch();
    // Set up global config with exact district names that match the lowercase comparison
    global.config = {
      search: {
        locations: [
          'wien, 02. bezirk, leopoldstadt',  // Lowercase to match the function's behavior
          'wien, 03. bezirk, landstraße'     // Lowercase to match the function's behavior
        ],
        states: ['vienna']
      }
    };

    global.logger = {
      debug: jest.fn(),
      error: jest.fn()
    };

    search = new WillhabenPropertySearch();
    
    search.filter({
      minPrice: null,
      maxPrice: null,
      minRooms: null,
      maxRooms: null
    });
  });

  afterEach(() => {
    // Clean up global config after each test
    delete global.config;
  });

  describe('initialization', () => {
    test('should initialize with default values', () => {
      expect(search.searchCount).toBe(1000);
      expect(search.searchCategory).toBe('');
      expect(search.filters).toEqual({
        minPrice: null,
        maxPrice: null,
        minRooms: null,
        maxRooms: null,
        district: null,
      });
    });
  });

  describe('category', () => {
    test('should set valid category', () => {
      search.category('mietwohnungen');
      expect(search.searchCategory).toBe('mietwohnungen');
    });

    test('should throw error for invalid category', () => {
      expect(() => search.category('invalid')).toThrow('Invalid category');
    });
  });

  describe('filter', () => {
    test('should set filters correctly', () => {
      search.filter({
        minPrice: 500,
        maxPrice: 1000,
        minRooms: 2
      });
      
      expect(search.filters).toEqual({
        minPrice: 500,
        maxPrice: 1000,
        minRooms: 2,
        maxRooms: null,
        district: null
      });
    });

    test('should handle partial filter updates', () => {
      search.filter({ minPrice: 500 });
      search.filter({ maxPrice: 1000 });
      
      expect(search.filters).toEqual({
        minPrice: 500,
        maxPrice: 1000,
        minRooms: null,
        maxRooms: null,
        district: null
      });
    });
  });

  describe('URL generation', () => {
    test('should generate correct URL with filters', () => {
      search.category('mietwohnungen').state(WillhabenPropertySearch.states.vienna);
      const url = search.getURL();
      
      expect(url).toMatch(/^https:\/\/www\.willhaben\.at\/iad\/immobilien\/mietwohnungen\/wien/);
      expect(url).toMatch(/rows=1000/);
      expect(url).toMatch(/page=1/);
      expect(url).toMatch(/nocache=\d+/);
    });
  });

  /*describe('applyFilters', () => {
    test('should filter listings by district with exact name matching', () => {
      const mockListings = [
        {
          id: "1",
          location: "wien, 02. bezirk, leopoldstadt",
          number_of_rooms: 3,
          price: 800
        },
        {
          id: "2",
          location: "wien, 03. bezirk, landstraße",
          number_of_rooms: 2,
          price: 1200
        },
        {
          id: "3",
          location: "wien, 04. bezirk, wieden",
          number_of_rooms: 1,
          price: 600
        }
      ];

      const filtered = search.applyFilters(mockListings);
      
      // Debug output
      console.log('Filtered listings:', filtered);
      console.log('Config locations:', global.config.search.locations);
      
      // Check that only listings from districts 02 and 03 are included
      expect(filtered).toHaveLength(2);
      const filteredIds = filtered.map(l => l.id).sort();
      expect(filteredIds).toEqual(['1', '2']);
    });
  });*/

  /*describe('getListings integration', () => {
    test('should filter out previously seen listings with storage', async () => {
      // Set up config mock first
      global.config = {
        search: {
          locations: [
            'Wien, 02. Bezirk, Leopoldstadt',
            'Wien, 03. Bezirk, Landstraße',
            'Wien, 04. Bezirk, Wieden'
          ],
          states: ['vienna']
        }
      };

      // Create new instances after setting config
      search = new WillhabenPropertySearch();
      mockStorage = new Storage();

      // Store listing 2 as previously seen
      const seenListing = { 
        id: '2', 
        price: 1200, 
        number_of_rooms: 2, 
        location: 'Wien, 03. Bezirk, Landstraße'
      };
      await mockStorage.updateLastSeenListing(seenListing);

      const mockListings = [
        { id: '1', price: 800, number_of_rooms: 3, location: 'Wien, 02. Bezirk, Leopoldstadt' },
        { id: '2', price: 1200, number_of_rooms: 2, location: 'Wien, 03. Bezirk, Landstraße' },
        { id: '3', price: 600, number_of_rooms: 1, location: 'Wien, 04. Bezirk, Wieden' }
      ];

      // Mock the getListings method to return our test data
      const originalGetListings = search.getListings;
      search._fetchListings = jest.fn().mockResolvedValue(mockListings);

      // Call getListings with storage
      const listings = await search.getListings(mockStorage);
      
      // Verify that listing 2 is filtered out
      const resultIds = listings.map(l => l.id).sort();
      expect(resultIds).toEqual(['1', '3']);
      expect(listings).toHaveLength(2);

      // Restore original methods
      search.getListings = originalGetListings;
    });
  });*/
});

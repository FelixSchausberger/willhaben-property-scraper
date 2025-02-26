import WillhabenPropertySearch from '../willhaben-property-search.js';
// import Storage from '../storage.js';

global.logger = {
  debug: jest.fn(),
  error: jest.fn()
};

describe('WillhabenPropertySearch', () => {
  let search;
  // let mockStorage;

  beforeEach(() => {
    // mockStorage = new Storage();
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

  describe('applyFilters', () => {
    test('should filter listings by district with flexible matching', () => {
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

      // Ensure config matches exact parsing logic in the method
      global.config = {
        search: {
          states: ['vienna'],
          locations: [
            'wien, 02. Bezirk, Leopoldstadt',
            'wien, 03. Bezirk, Landstraße'
          ]
        }
      };

      // Reset any existing filters
      search.filters = {
        minPrice: 500,
        maxPrice: 1200,
        minRooms: 2,
        maxRooms: 5
      };

      const filtered = search.applyFilters(mockListings);

      expect(filtered).toHaveLength(2);
      const filteredIds = filtered.map(l => l.id).sort();
      expect(filteredIds).toEqual(['1', '2']);
    });
  });

  describe('getListings integration', () => {
    test('should filter out previously seen listings with storage', async () => {
      const search = new WillhabenPropertySearch();
      search.filter({
        minPrice: 500,
        maxPrice: 1500
      });
   
      search.sleep = jest.fn().mockResolvedValue(null);
      search.retry = jest.fn(async (fn) => await fn());
   
      const mockResponse = {
        props: {
          pageProps: {
            searchResult: {
              advertSummaryList: {
                advertSummary: [
                  { 
                    id: '1', 
                    attributes: { 
                      attribute: [
                        { name: 'PRICE', values: ['800'] },
                        { name: 'LOCATION', values: ['Wien, 02. Bezirk, Leopoldstadt'] },
                        { name: 'HEADING', values: ['Nice Apartment'] }
                      ] 
                    }
                  },
                  { 
                    id: '2', 
                    attributes: { 
                      attribute: [
                        { name: 'PRICE', values: ['1200'] },
                        { name: 'LOCATION', values: ['Wien, 03. Bezirk, Landstraße'] },
                        { name: 'HEADING', values: ['Existing Listing'] }
                      ] 
                    }
                  },
                  { 
                    id: '3', 
                    attributes: { 
                      attribute: [
                        { name: 'PRICE', values: ['1100'] },
                        { name: 'LOCATION', values: ['Wien, 04. Bezirk, Wieden'] },
                        { name: 'HEADING', values: ['New Apartment'] }
                      ] 
                    }
                  }
                ]
              }
            }
          }
        }
      };
   
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(
          `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(mockResponse)}</script>`
        )
      });
   
      const mockStorage = {
        getLastSeenListing: jest.fn().mockResolvedValue({ 
          id: '2',
          price: 1200,
          _lastUpdated: new Date(Date.now() - 1000).toISOString()  // Set a timestamp
        }),
        updateLastSeenListing: jest.fn()
      };
   
      const listings = await search.getListings(mockStorage);
      
      // Debug logging
      // console.log('Filters:', search.filters);
      // console.log('Processed listings:', listings);
      
      const resultIds = listings.map(l => l.id).sort();
      expect(resultIds).toEqual(['3']);
      expect(listings).toHaveLength(1);
      
      expect(mockStorage.updateLastSeenListing).toHaveBeenCalledWith(
        expect.objectContaining({ id: '3' })
      );
    }, 30000);
  });
});

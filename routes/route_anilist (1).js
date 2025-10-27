import { Router } from "express";
import axios from "axios";
import { validate, asyncHandler } from "../utils/validation.js";

const router = Router();

class AniList {
  constructor() {
    this.apiUrl = "https://graphql.anilist.co";
  }

  async query(query, variables = {}) {
    try {
      const response = await axios.post(this.apiUrl, {
        query,
        variables
      }, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        timeout: 15000
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data;
    } catch (error) {
      throw new Error(`AniList API error: ${error.message}`);
    }
  }

  // Search Anime/Manga
  async search(query, type = "ANIME", page = 1, perPage = 10) {
    const gql = `
      query ($search: String, $type: MediaType, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(search: $search, type: $type, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            bannerImage
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            description
            season
            seasonYear
            type
            format
            status
            episodes
            duration
            chapters
            volumes
            genres
            synonyms
            averageScore
            meanScore
            popularity
            favourites
            trending
            tags {
              name
              rank
            }
            studios {
              nodes {
                name
              }
            }
            isAdult
            nextAiringEpisode {
              airingAt
              timeUntilAiring
              episode
            }
          }
        }
      }
    `;

    const data = await this.query(gql, { search: query, type, page, perPage });
    return data.Page;
  }

  // Get Anime/Manga by ID
  async getById(id, type = "ANIME") {
    const gql = `
      query ($id: Int, $type: MediaType) {
        Media(id: $id, type: $type) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
            medium
            color
          }
          bannerImage
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          description
          season
          seasonYear
          type
          format
          status
          episodes
          duration
          chapters
          volumes
          genres
          synonyms
          source
          hashtag
          trailer {
            id
            site
            thumbnail
          }
          updatedAt
          coverImage {
            large
          }
          bannerImage
          averageScore
          meanScore
          popularity
          favourites
          trending
          tags {
            name
            description
            rank
            isMediaSpoiler
          }
          relations {
            edges {
              node {
                id
                title {
                  romaji
                }
                type
                format
              }
              relationType
            }
          }
          characters {
            edges {
              node {
                id
                name {
                  full
                }
                image {
                  large
                }
              }
              role
            }
          }
          staff {
            edges {
              node {
                id
                name {
                  full
                }
                image {
                  large
                }
              }
              role
            }
          }
          studios {
            edges {
              node {
                id
                name
              }
            }
          }
          isAdult
          nextAiringEpisode {
            airingAt
            timeUntilAiring
            episode
          }
          externalLinks {
            url
            site
          }
          streamingEpisodes {
            title
            thumbnail
            url
          }
          rankings {
            rank
            type
            format
            year
            season
            allTime
            context
          }
          stats {
            scoreDistribution {
              score
              amount
            }
            statusDistribution {
              status
              amount
            }
          }
        }
      }
    `;

    const data = await this.query(gql, { id: parseInt(id), type });
    return data.Media;
  }

  // Get Trending Anime/Manga
  async getTrending(type = "ANIME", page = 1, perPage = 20) {
    const gql = `
      query ($type: MediaType, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(type: $type, sort: TRENDING_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            bannerImage
            startDate {
              year
            }
            description
            type
            format
            status
            episodes
            chapters
            genres
            averageScore
            popularity
            trending
            isAdult
            nextAiringEpisode {
              episode
              airingAt
              timeUntilAiring
            }
          }
        }
      }
    `;

    const data = await this.query(gql, { type, page, perPage });
    return data.Page;
  }

  // Get Popular Anime/Manga
  async getPopular(type = "ANIME", page = 1, perPage = 20) {
    const gql = `
      query ($type: MediaType, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(type: $type, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            bannerImage
            startDate {
              year
            }
            description
            type
            format
            status
            episodes
            chapters
            genres
            averageScore
            popularity
            isAdult
          }
        }
      }
    `;

    const data = await this.query(gql, { type, page, perPage });
    return data.Page;
  }

  // Get Seasonal Anime
  async getSeasonal(season, year, page = 1, perPage = 20) {
    const gql = `
      query ($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            bannerImage
            startDate {
              year
              month
              day
            }
            description
            format
            status
            episodes
            genres
            averageScore
            popularity
            studios {
              nodes {
                name
              }
            }
            nextAiringEpisode {
              episode
              airingAt
              timeUntilAiring
            }
          }
        }
      }
    `;

    const data = await this.query(gql, { season: season.toUpperCase(), seasonYear: parseInt(year), page, perPage });
    return data.Page;
  }

  // Get Character by ID
  async getCharacter(id) {
    const gql = `
      query ($id: Int) {
        Character(id: $id) {
          id
          name {
            full
            native
            alternative
          }
          image {
            large
            medium
          }
          description
          gender
          dateOfBirth {
            year
            month
            day
          }
          age
          bloodType
          favourites
          media {
            edges {
              node {
                id
                title {
                  romaji
                }
                coverImage {
                  large
                }
              }
              voiceActors {
                id
                name {
                  full
                }
                image {
                  large
                }
                language
              }
            }
          }
        }
      }
    `;

    const data = await this.query(gql, { id: parseInt(id) });
    return data.Character;
  }

  // Search Character
  async searchCharacter(query, page = 1, perPage = 10) {
    const gql = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          characters(search: $search, sort: FAVOURITES_DESC) {
            id
            name {
              full
              native
            }
            image {
              large
              medium
            }
            description
            gender
            favourites
            media {
              nodes {
                id
                title {
                  romaji
                }
                type
              }
            }
          }
        }
      }
    `;

    const data = await this.query(gql, { search: query, page, perPage });
    return data.Page;
  }

  // Get Staff/Voice Actor by ID
  async getStaff(id) {
    const gql = `
      query ($id: Int) {
        Staff(id: $id) {
          id
          name {
            full
            native
          }
          image {
            large
            medium
          }
          description
          primaryOccupations
          gender
          dateOfBirth {
            year
            month
            day
          }
          age
          yearsActive
          homeTown
          bloodType
          favourites
          staffMedia {
            edges {
              node {
                id
                title {
                  romaji
                }
                coverImage {
                  large
                }
                type
              }
              staffRole
            }
          }
          characters {
            edges {
              node {
                id
                name {
                  full
                }
                image {
                  large
                }
              }
              role
              media {
                id
                title {
                  romaji
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.query(gql, { id: parseInt(id) });
    return data.Staff;
  }

  // Get Random Anime/Manga
  async getRandom(type = "ANIME") {
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const gql = `
      query ($type: MediaType, $page: Int) {
        Page(page: $page, perPage: 1) {
          media(type: $type, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
            }
            bannerImage
            description
            format
            status
            episodes
            chapters
            genres
            averageScore
            popularity
          }
        }
      }
    `;

    const data = await this.query(gql, { type, page: randomPage });
    return data.Page.media[0];
  }

  // Get Airing Schedule
  async getAiringSchedule(page = 1, perPage = 20) {
    const gql = `
      query ($page: Int, $perPage: Int, $airingAt_greater: Int, $airingAt_lesser: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          airingSchedules(
            airingAt_greater: $airingAt_greater
            airingAt_lesser: $airingAt_lesser
            sort: TIME
          ) {
            id
            airingAt
            timeUntilAiring
            episode
            media {
              id
              title {
                romaji
                english
              }
              coverImage {
                large
              }
              bannerImage
              description
              status
              genres
              averageScore
            }
          }
        }
      }
    `;

    const now = Math.floor(Date.now() / 1000);
    const oneWeek = 7 * 24 * 60 * 60;

    const data = await this.query(gql, {
      page,
      perPage,
      airingAt_greater: now,
      airingAt_lesser: now + oneWeek
    });
    return data.Page;
  }
}

const anilist = new AniList();

// Search Anime
router.get("/api/anilist/anime/search", asyncHandler(async (req, res) => {
  const { query, page = 1, perPage = 10 } = req.query;
  
  if (!validate.notEmpty(query)) {
    return res.status(400).json({
      success: false,
      error: "Query is required"
    });
  }
  
  const result = await anilist.search(query, "ANIME", parseInt(page), parseInt(perPage));
  res.json({ success: true, data: result });
}));

// Search Manga
router.get("/api/anilist/manga/search", asyncHandler(async (req, res) => {
  const { query, page = 1, perPage = 10 } = req.query;
  
  if (!validate.notEmpty(query)) {
    return res.status(400).json({
      success: false,
      error: "Query is required"
    });
  }
  
  const result = await anilist.search(query, "MANGA", parseInt(page), parseInt(perPage));
  res.json({ success: true, data: result });
}));

// Get Anime by ID
router.get("/api/anilist/anime/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await anilist.getById(id, "ANIME");
  res.json({ success: true, data: result });
}));

// Get Manga by ID
router.get("/api/anilist/manga/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await anilist.getById(id, "MANGA");
  res.json({ success: true, data: result });
}));

// Trending Anime
router.get("/api/anilist/anime/trending", asyncHandler(async (req, res) => {
  const { page = 1, perPage = 20 } = req.query;
  const result = await anilist.getTrending("ANIME", parseInt(page), parseInt(perPage));
  res.json({ success: true, data: result });
}));

// Trending Manga
router.get("/api/anilist/manga/trending", asyncHandler(async (req, res) => {
  const { page = 1, perPage = 20 } = req.query;
  const result = await anilist.getTrending("MANGA", parseInt(page), parseInt(perPage));
  res.json({ success: true, data: result });
}));

// Popular Anime
router.get("/api/anilist/anime/popular", asyncHandler(async (req, res) => {
  const { page = 1, perPage = 20 } = req.query;
  const result = await anilist.getPopular("ANIME", parseInt(page), parseInt(perPage));
  res.json({ success: true, data: result });
}));

// Popular Manga
router.get("/api/anilist/manga/popular", asyncHandler(async (req, res) => {
  const { page = 1, perPage = 20 } = req.query;
  const result = await anilist.getPopular("MANGA", parseInt(page), parseInt(perPage));
  res.json({ success: true, data: result });
}));

// Seasonal Anime
router.get("/api/anilist/anime/season", asyncHandler(async (req, res) => {
  const { season, year, page = 1, perPage = 20 } = req.query;
  
  if (!season || !year) {
    return res.status(400).json({
      success: false,
      error: "Season and year are required",
      seasons: ["WINTER", "SPRING", "SUMMER", "FALL"]
    });
  }
  
  const result = await anilist.getSeasonal(season, year, parseInt(page), parseInt(perPage));
  res.json({ success: true, data: result });
}));

// Random Anime
router.get("/api/anilist/anime/random", asyncHandler(async (req, res) => {
  const result = await anilist.getRandom("ANIME");
  res.json({ success: true, data: result });
}));

// Random Manga
router.get("/api/anilist/manga/random", asyncHandler(async (req, res) => {
  const result = await anilist.getRandom("MANGA");
  res.json({ success: true, data: result });
}));

// Search Character
router.get("/api/anilist/character/search", asyncHandler(async (req, res) => {
  const { query, page = 1, perPage = 10 } = req.query;
  
  if (!validate.notEmpty(query)) {
    return res.status(400).json({
      success: false,
      error: "Query is required"
    });
  }
  
  const result = await anilist.searchCharacter(query, parseInt(page), parseInt(perPage));
  res.json({ success: true, data: result });
}));

// Get Character by ID
router.get("/api/anilist/character/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await anilist.getCharacter(id);
  res.json({ success: true, data: result });
}));

// Get Staff by ID
router.get("/api/anilist/staff/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await anilist.getStaff(id);
  res.json({ success: true, data: result });
}));

// Airing Schedule
router.get("/api/anilist/airing", asyncHandler(async (req, res) => {
  const { page = 1, perPage = 20 } = req.query;
  const result = await anilist.getAiringSchedule(parseInt(page), parseInt(perPage));
  res.json({ success: true, data: result });
}));

export const metadata = [
  {
    name: "AniList Search Anime",
    path: "/api/anilist/anime/search",
    method: "GET",
    description: "Search anime on AniList",
    params: [
      { name: "query", type: "text", required: true, placeholder: "Naruto", description: "Search query" },
      { name: "page", type: "number", required: false, placeholder: "1", description: "Page number" },
      { name: "perPage", type: "number", required: false, placeholder: "10", description: "Results per page" }
    ]
  },
  {
    name: "AniList Search Manga",
    path: "/api/anilist/manga/search",
    method: "GET",
    description: "Search manga on AniList",
    params: [
      { name: "query", type: "text", required: true, placeholder: "One Piece", description: "Search query" },
      { name: "page", type: "number", required: false, placeholder: "1", description: "Page number" },
      { name: "perPage", type: "number", required: false, placeholder: "10", description: "Results per page" }
    ]
  },
  {
    name: "AniList Anime Details",
    path: "/api/anilist/anime/:id",
    method: "GET",
    description: "Get detailed anime information by ID",
    params: [
      { name: "id", type: "number", required: true, placeholder: "21", description: "AniList anime ID" }
    ]
  },
  {
    name: "AniList Manga Details",
    path: "/api/anilist/manga/:id",
    method: "GET",
    description: "Get detailed manga information by ID",
    params: [
      { name: "id", type: "number", required: true, placeholder: "30013", description: "AniList manga ID" }
    ]
  },
  {
    name: "AniList Trending Anime",
    path: "/api/anilist/anime/trending",
    method: "GET",
    description: "Get trending anime",
    params: [
      { name: "page", type: "number", required: false, placeholder: "1", description: "Page number" },
      { name: "perPage", type: "number", required: false, placeholder: "20", description: "Results per page" }
    ]
  },
  {
    name: "AniList Trending Manga",
    path: "/api/anilist/manga/trending",
    method: "GET",
    description: "Get trending manga",
    params: [
      { name: "page", type: "number", required: false, placeholder: "1", description: "Page number" },
      { name: "perPage", type: "number", required: false, placeholder: "20", description: "Results per page" }
    ]
  },
  {
    name: "AniList Popular Anime",
    path: "/api/anilist/anime/popular",
    method: "GET",
    description: "Get popular anime",
    params: [
      { name: "page", type: "number", required: false, placeholder: "1", description: "Page number" },
      { name: "perPage", type: "number", required: false, placeholder: "20", description: "Results per page" }
    ]
  },
  {
    name: "AniList Popular Manga",
    path: "/api/anilist/manga/popular",
    method: "GET",
    description: "Get popular manga",
    params: [
      { name: "page", type: "number", required: false, placeholder: "1", description: "Page number" },
      { name: "perPage", type: "number", required: false, placeholder: "20", description: "Results per page" }
    ]
  },
  {
    name: "AniList Seasonal Anime",
    path: "/api/anilist/anime/season",
    method: "GET",
    description: "Get anime by season and year",
    params: [
      { name: "season", type: "text", required: true, placeholder: "WINTER", description: "Season: WINTER, SPRING, SUMMER, FALL" },
      { name: "year", type: "number", required: true, placeholder: "2025", description: "Year" },
      { name: "page", type: "number", required: false, placeholder: "1", description: "Page number" },
      { name: "perPage", type: "number", required: false, placeholder: "20", description: "Results per page" }
    ]
  },
  {
    name: "AniList Random Anime",
    path: "/api/anilist/anime/random",
    method: "GET",
    description: "Get random anime",
    params: []
  },
  {
    name: "AniList Random Manga",
    path: "/api/anilist/manga/random",
    method: "GET",
    description: "Get random manga",
    params: []
  },
  {
    name: "AniList Search Character",
    path: "/api/anilist/character/search",
    method: "GET",
    description: "Search anime/manga characters",
    params: [
      { name: "query", type: "text", required: true, placeholder: "Nezuko", description: "Character name" },
      { name: "page", type: "number", required: false, placeholder: "1", description: "Page number" },
      { name: "perPage", type: "number", required: false, placeholder: "10", description: "Results per page" }
    ]
  },
  {
    name: "AniList Character Details",
    path: "/api/anilist/character/:id",
    method: "GET",
    description: "Get detailed character information",
    params: [
      { name: "id", type: "number", required: true, placeholder: "40", description: "Character ID" }
    ]
  },
  {
    name: "AniList Staff Details",
    path: "/api/anilist/staff/:id",
    method: "GET",
    description: "Get staff/voice actor information",
    params: [
      { name: "id", type: "number", required: true, placeholder: "95271", description: "Staff ID" }
    ]
  },
  {
    name: "AniList Airing Schedule",
    path: "/api/anilist/airing",
    method: "GET",
    description: "Get anime airing schedule (next 7 days)",
    params: [
      { name: "page", type: "number", required: false, placeholder: "1", description: "Page number" },
      { name: "perPage", type: "number", required: false, placeholder: "20", description: "Results per page" }
    ]
  }
];

export default router;
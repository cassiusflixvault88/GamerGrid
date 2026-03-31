# 🎬 How to Add Movies to FlixVault - Complete Guide

## ✅ **Current Status**
- **446 movies** with trailers are in the catalog
- All movies are centralized in `/app/backend/tmdb_catalog.py`
- Movies automatically appear **EVERYWHERE** when added to this file

---

## 🚀 **Where Your Movies Appear Automatically**

When you add movies to `tmdb_catalog.py`, they will instantly show up in:

1. ✅ **/movies** page (Browse All Movies - with genre tabs)
2. ✅ **Search autocomplete** (Live results as you type)
3. ✅ **Search results** page  
4. ✅ **Homepage "Browse All Movies" section** (Big purple button)
5. ✅ **All genre filters** (Action, Comedy, Horror, Sci-Fi, etc.)

**NO CODE CHANGES NEEDED** - Just update the catalog file!

---

## 📝 **Step-by-Step: Adding 1000+ Movies**

### **Option 1: Manual Addition (Small Batches)**

Edit `/app/backend/tmdb_catalog.py` and add movies to the `TMDB_CATALOG` list:

```python
TMDB_CATALOG = [
    {
        'id': 12345,  # Unique TMDB ID
        'title': 'Movie Title Here',
        'original_title': 'Movie Title Here',
        'overview': 'Movie description...',
        'poster_path': '/posterImagePath.jpg',
        'backdrop_path': '/backdropImagePath.jpg',
        'release_date': '2025-12-01',
        'vote_average': 7.5,
        'vote_count': 1500,
        'popularity': 250.5,
        'genre_ids': [28, 12, 878],  # Action, Adventure, Sci-Fi
        'youtube_trailer': 'YouTubeVideoID',  # REQUIRED for trailers!
        'media_type': 'movie',
        'adult': False,
        'original_language': 'en'
    },
    # Add more movies here...
]
```

### **Option 2: Bulk Import from TMDB (Recommended for 1000+ Movies)**

Create a Python script `/app/backend/fetch_tmdb_movies.py`:

```python
import requests
import json

# Your TMDB API key (get from https://www.themoviedb.org/settings/api)
TMDB_API_KEY = "YOUR_TMDB_API_KEY_HERE"
BASE_URL = "https://api.themoviedb.org/3"

def fetch_popular_movies(pages=50):  # 50 pages = ~1000 movies
    all_movies = []
    
    for page in range(1, pages + 1):
        print(f"Fetching page {page}...")
        response = requests.get(
            f"{BASE_URL}/movie/popular",
            params={"api_key": TMDB_API_KEY, "page": page}
        )
        data = response.json()
        
        for movie in data.get('results', []):
            # Fetch trailer
            videos_response = requests.get(
                f"{BASE_URL}/movie/{movie['id']}/videos",
                params={"api_key": TMDB_API_KEY}
            )
            videos = videos_response.json().get('results', [])
            trailer = next((v['key'] for v in videos if v['type'] == 'Trailer' and v['site'] == 'YouTube'), None)
            
            if trailer:  # Only add movies with trailers
                movie['youtube_trailer'] = trailer
                movie['media_type'] = 'movie'
                all_movies.append(movie)
        
    return all_movies

# Fetch movies
movies = fetch_popular_movies(pages=50)  # Adjust pages for more/less movies
print(f"✅ Fetched {len(movies)} movies with trailers")

# Save to catalog file
with open('/app/backend/tmdb_catalog.py', 'w') as f:
    f.write('"""\\nTMDB Movie Catalog\\nAuto-generated\\n"""\\n\\n')
    f.write(f'TMDB_CATALOG = {json.dumps(movies, indent=2)}\\n\\n')
    f.write('''
def get_tmdb_catalog():
    return TMDB_CATALOG

def get_catalog_size():
    return len(TMDB_CATALOG)

def get_movies_by_genre(genre_id):
    return [m for m in TMDB_CATALOG if genre_id in m.get('genre_ids', [])]

def get_popular_movies(limit=20):
    return sorted(TMDB_CATALOG, key=lambda x: x.get('popularity', 0), reverse=True)[:limit]
''')

print(f"✅ Saved {len(movies)} movies to tmdb_catalog.py")
```

**Run the script:**
```bash
cd /app/backend
python3 fetch_tmdb_movies.py
```

---

## 🎯 **Important Requirements for Each Movie**

Each movie **MUST** have these fields:

| Field | Required? | Example | Notes |
|-------|-----------|---------|-------|
| `id` | ✅ | `12345` | Unique TMDB ID |
| `title` | ✅ | `"Avatar"` | Display title |
| `overview` | ✅ | `"A marine on Pandora..."` | Description |
| `poster_path` | ✅ | `"/abc123.jpg"` | Poster image |
| `youtube_trailer` | ✅ | `"xyz789"` | **YouTube video ID** |
| `release_date` | ✅ | `"2025-12-01"` | Release date |
| `vote_average` | ✅ | `7.5` | Rating (0-10) |
| `genre_ids` | ✅ | `[28, 12]` | Genre IDs |
| `media_type` | ✅ | `"movie"` | Always "movie" |

---

## 🔥 **Genre IDs Reference**

| Genre | ID |
|-------|-----|
| Action | 28 |
| Adventure | 12 |
| Animation | 16 |
| Comedy | 35 |
| Crime | 80 |
| Documentary | 99 |
| Drama | 18 |
| Family | 10751 |
| Fantasy | 14 |
| History | 36 |
| Horror | 27 |
| Music | 10402 |
| Mystery | 9648 |
| Romance | 10749 |
| Science Fiction | 878 |
| Thriller | 53 |
| War | 10752 |
| Western | 37 |

---

## ✅ **After Adding Movies**

1. **Backend automatically loads** the new catalog (hot reload)
2. **Frontend automatically fetches** from `/api/catalog/movies`
3. **Search instantly includes** new movies
4. **All genre tabs update** automatically

**No server restart needed!** (Unless you change function signatures)

---

## 🧪 **Testing Your Changes**

```bash
# 1. Verify catalog size
python3 -c "from tmdb_catalog import get_catalog_size; print(f'Total movies: {get_catalog_size()}')"

# 2. Test API endpoint
curl http://localhost:8001/api/catalog/movies?limit=5

# 3. Check frontend (open in browser)
http://localhost:3000/movies
```

---

## 🎉 **Quick Commands**

```bash
# Add movies from TMDB
cd /app/backend
python3 fetch_tmdb_movies.py

# Check current count
python3 -c "from tmdb_catalog import TMDB_CATALOG; print(len(TMDB_CATALOG))"

# Test search
curl "http://localhost:8001/api/catalog/movies?limit=10"
```

---

## 📌 **Pro Tips**

- Always include `youtube_trailer` - movies without trailers won't be useful
- Use high-quality poster images (`poster_path` from TMDB)
- Keep `vote_average` and `popularity` for better sorting
- Test with a small batch first (10-20 movies) before bulk import

**Your movies will appear EVERYWHERE automatically! 🚀**

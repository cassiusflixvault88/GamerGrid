# FlixVault Customization Guide
## Created by E1 for Cassius Fox

---

## 📚 HOW TO ADD MORE MOVIES (Beyond TMDB)

### Option 1: Add to Public Domain List (EASIEST)

**File:** `/app/backend/public_domain_videos.py`

**Steps:**
1. Open the file
2. Add your movie to the `PUBLIC_DOMAIN_CONTENT` array
3. Follow this format:

```python
{
    "id": 9000007,  # Use unique ID (9000000+)
    "title": "Your Movie Name",
    "overview": "Description of the movie...",
    "poster_path": "/path-to-poster.jpg",  # Or use a URL
    "backdrop_path": "/path-to-backdrop.jpg",
    "media_type": "movie",
    "release_date": "1999-12-31",
    "vote_average": 7.5,
    "runtime": 120,
    "youtube_id": "YouTube_Video_ID",  # For trailer
    "is_public_domain": True,
    "genre_ids": [28, 12]  # Genre IDs
}
```

4. Restart backend: `sudo supervisorctl restart backend`
5. Movie appears in "Free Movies" section!

**Genre IDs Reference:**
- 28 = Action
- 12 = Adventure
- 35 = Comedy
- 18 = Drama
- 27 = Horror
- 10749 = Romance
- 878 = Science Fiction
- 53 = Thriller

---

### Option 2: Create Your Own Curated Collections

**Create new file:** `/app/backend/custom_movies.py`

```python
CURATED_MOVIES = [
    {
        "id": 8000001,
        "title": "The Shawshank Redemption",
        "overview": "Two imprisoned men bond over years...",
        # ... add all fields like above
    },
    {
        "id": 8000002,
        "title": "The Godfather",
        # ... more details
    }
]

def get_curated_movies():
    return CURATED_MOVIES
```

Then add endpoint in `/app/backend/server.py`:

```python
from custom_movies import get_curated_movies

@api_router.get("/curated/movies")
async def get_curated():
    return {"movies": get_curated_movies()}
```

---

### Option 3: Let Users Submit Movies (Community-Driven)

Create an admin panel or submission form where users can suggest movies!

**Backend endpoint example:**

```python
@api_router.post("/submit-movie")
async def submit_movie(movie_data: dict, token_data: dict = Depends(verify_token)):
    # Save to database for admin approval
    await db.submitted_movies.insert_one({
        "submitted_by": token_data["user_id"],
        "movie_data": movie_data,
        "status": "pending",
        "created_at": datetime.utcnow()
    })
    return {"message": "Movie submitted for review"}
```

---

## 🎨 HOW TO CHANGE APP COLORS

### Purple/Blue Gradient (Current Colors)

**Files to edit:**

1. **Main Theme Colors** - `/app/frontend/src/index.css`

Find this section:
```css
:root {
    --primary: 0 0% 9%;  /* Main color */
    --secondary: 0 0% 96.1%;  /* Secondary */
    /* ... more colors */
}
```

2. **Gradient Colors** (Logo, Buttons)

**Find & Replace across all files:**

Current: `from-purple-500 to-blue-500`
Replace with your colors: `from-red-500 to-orange-500`

**Example locations:**
- Navbar logo: `/app/frontend/src/components/Navbar.jsx`
- Buttons: `/app/frontend/src/components/AuthModal.jsx`
- Footer: `/app/frontend/src/components/Footer.jsx`

---

### Color Scheme Examples:

**Netflix Red:**
```
from-red-600 to-red-700
theme-color: #E50914
```

**Disney+ Blue:**
```
from-blue-600 to-blue-800
theme-color: #0063E5
```

**Hulu Green:**
```
from-green-500 to-teal-600
theme-color: #1CE783
```

**Custom Gold/Black (Luxury):**
```
from-yellow-500 to-amber-600
theme-color: #FFD700
```

---

### Quick Find & Replace Guide:

1. **Logo/Brand Color:**
   - Search: `from-purple-500 to-blue-500`
   - Replace: `from-YOUR_COLOR-500 to-YOUR_COLOR-600`

2. **Button Hover Colors:**
   - Search: `from-purple-600 to-blue-600`
   - Replace with your preferred gradient

3. **Theme Color (PWA/Browser):**
   - File: `/app/frontend/public/index.html`
   - Find: `<meta name="theme-color" content="#8B5CF6" />`
   - Change `#8B5CF6` to your hex color

4. **Manifest (App Icon Background):**
   - File: `/app/frontend/public/manifest.json`
   - Find: `"theme_color": "#8B5CF6"`
   - Change to your color

---

## 🎬 ADDING YOUR OWN HONEST REVIEWS

### As Site Owner (Your Reviews Featured):

1. Create an account on your site
2. Rate movies normally
3. Your reviews appear like other users

**To HIGHLIGHT your reviews:**

Edit `/app/frontend/src/components/RatingsReviews.jsx`:

Find the review display section and add:

```javascript
{ratings.ratings.map((r) => (
  <div
    key={r.id}
    className={`bg-white/5 border rounded-lg p-4 ${
      r.username === 'CassiusFox' ? 'border-yellow-500 ring-2 ring-yellow-500/50' : 'border-white/10'
    }`}
  >
    {r.username === 'CassiusFox' && (
      <Badge className="mb-2 bg-yellow-500 text-black">Creator's Review ⭐</Badge>
    )}
    {/* ... rest of review */}
  </div>
))}
```

Replace `'CassiusFox'` with your actual username!

---

## 📊 ADDING MOVIE POSTER IMAGES

### Option 1: Use TMDB Images (Automatic)
- Already working! All TMDB movies have posters

### Option 2: Upload Your Own Images

**For custom movies:**

1. **Upload to image hosting:**
   - Imgur (free)
   - Cloudinary (free tier)
   - GitHub (as static files)

2. **Use full URL in poster_path:**

```python
{
    "id": 9000010,
    "title": "My Movie",
    "poster_path": "https://i.imgur.com/YOUR_IMAGE_ID.jpg",
    "backdrop_path": "https://i.imgur.com/BACKDROP_ID.jpg",
    # ...
}
```

### Option 3: Store in Your App

1. Create folder: `/app/frontend/public/posters/`
2. Add images: `my-movie-poster.jpg`
3. Reference: `"poster_path": "/posters/my-movie-poster.jpg"`

---

## 🚀 DEPLOY AFTER CHANGES

After any changes:
1. Save all files
2. Check logs: `tail -f /var/log/supervisor/frontend.out.log`
3. If needed: `sudo supervisorctl restart frontend`
4. Test in preview
5. Click **Deploy** to push live!

---

## 💡 PRO TIPS

1. **Start Small:** Add 10-20 curated movies first
2. **Get Reviews:** Invite friends to review movies
3. **Feature Popular:** Highlight movies with most reviews
4. **Update Regularly:** Add new movies weekly
5. **Community Input:** Let users suggest movies

---

**Questions?** Just ask me and I'll help! 🎬

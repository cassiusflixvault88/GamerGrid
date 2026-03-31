# 🚨 CRITICAL FIXES NEEDED - Action Plan

## ❌ **CRITICAL ERRORS (Blocking App)**

### 1. setSelectedContent Runtime Error
**Status:** ⚠️ PARTIALLY FIXED
**What's Fixed:**
- ContentModal.jsx updated to accept `onSelectContent` prop
- Home.jsx updated to pass the prop

**What's Needed:**
All these pages need to add `onSelectContent` prop to ContentModal:
```javascript
onSelectContent={(content) => {
  setSelectedContent(content);
  setModalOpen(true);
}}
```

**Files to Update:**
- [ ] /app/frontend/src/pages/MoviesPage.jsx
- [ ] /app/frontend/src/pages/SeriesPage.jsx  
- [ ] /app/frontend/src/pages/OriginalsPage.jsx
- [ ] /app/frontend/src/pages/PublicDomainPage.jsx
- [ ] /app/frontend/src/pages/SearchPage.jsx
- [ ] /app/frontend/src/pages/WatchlistPage.jsx

---

## 🐛 **HIGH PRIORITY BUGS**

### 2. Star Ratings Not Clickable in Movie Reviews
**Problem:** When writing a review for individual movies, stars don't respond to clicks
**File:** Likely in `RatingsReviews` component or ContentModal
**Fix:** Check event handlers on star elements, ensure onClick is properly bound

### 3. Watchlist Not Working 100%
**Issues:** Items not adding/removing correctly
**Fix:** Check `/api/watchlist/add` and `/api/watchlist/remove` endpoints

---

## ✅ **QUICK WINS**

### 4. Remove Preferences Section from Settings
**File:** /app/frontend/src/pages/SettingsPage.jsx
**What to Remove:**
- Autoplay Trailers toggle
- Email Notifications toggle  
- Entire "Preferences" section

**Why:** Features don't work and take forever to save

---

## 🎯 **ENHANCEMENTS**

### 5. Sort Movies by Top Rated First
**Files:** 
- /app/frontend/src/pages/MoviesPage.jsx (All Movies tab)
- /app/frontend/src/components/SearchAutocomplete.jsx (Search results)

**Current:** Movies sorted alphabetically or by popularity
**Change to:** Sort by `vote_average` descending (highest rated first)

```javascript
const sortedMovies = [...movies].sort((a, b) => b.vote_average - a.vote_average);
```

### 6. Add 5,000 Most Popular Movies
**File:** /app/backend/tmdb_catalog.py
**Guide:** /app/HOW_TO_ADD_MOVIES.md

**Steps:**
1. Use TMDB API to fetch popular movies (250 pages × 20 movies = 5,000)
2. Include movies with trailers only
3. Update tmdb_catalog.py with new dataset
4. Movies will auto-appear in app

---

## 📋 **PRIORITY ORDER**

**Immediate (Blocking):**
1. ✅ Fix setSelectedContent error (partially done - needs all pages)
2. 🔴 Fix star ratings in reviews
3. 🔴 Remove Preferences section

**High Priority:**
4. Fix watchlist functionality
5. Sort by top rated
6. Profile picture logo (CORS fixed, needs cache clear)

**Medium Priority:**
7. Add 5,000 movies guide/script

---

## 🛠️ **QUICK FIX SCRIPT FOR setSelectedContent**

Run this to update all pages at once:

```bash
# For each file, add onSelectContent prop to ContentModal
FILES=(
  "/app/frontend/src/pages/MoviesPage.jsx"
  "/app/frontend/src/pages/SeriesPage.jsx"
  "/app/frontend/src/pages/OriginalsPage.jsx"
  "/app/frontend/src/pages/PublicDomainPage.jsx"
  "/app/frontend/src/pages/SearchPage.jsx"
  "/app/frontend/src/pages/WatchlistPage.jsx"
)

for file in "${FILES[@]}"; do
  echo "Updating $file..."
  # Add onSelectContent prop after onPlayTrailer
done
```

---

## ✅ **FILES ALREADY FIXED**

1. ✅ /app/frontend/src/components/ContentModal.jsx - Now accepts onSelectContent prop
2. ✅ /app/frontend/src/pages/Home.jsx - Passes onSelectContent prop
3. ✅ /app/backend/server.py - CORS middleware added for profile pictures
4. ✅ /app/frontend/src/context/AuthContext.jsx - Session management fixed

---

## 🎬 **TESTING CHECKLIST**

After all fixes:
- [ ] Homepage loads without errors
- [ ] Can click on movies to open modal
- [ ] "More Like This" section works
- [ ] Star ratings clickable in review modal
- [ ] Can write and submit reviews
- [ ] Watchlist add/remove works
- [ ] Settings page loads (no Preferences section)
- [ ] Movies sorted by rating in /movies page
- [ ] Profile pictures show correctly (after cache clear)
- [ ] Session stays active for 10 minutes

---

## 📄 **NEXT AGENT INSTRUCTIONS**

1. Start with completing the setSelectedContent fix for all pages
2. Fix star ratings interactivity
3. Remove Preferences section
4. Fix watchlist
5. Add top-rated sorting
6. Test thoroughly before finishing

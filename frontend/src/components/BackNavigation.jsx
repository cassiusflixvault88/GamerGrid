import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Home, Film, Tv } from 'lucide-react';

const BackNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on homepage
  if (location.pathname === '/') {
    return null;
  }

  // Generate breadcrumb based on current path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const breadcrumbs = [{ name: 'Home', path: '/', icon: Home }];

    if (path.includes('/movies')) {
      breadcrumbs.push({ name: 'Movies', path: '/movies', icon: Film });
    } else if (path.includes('/series')) {
      breadcrumbs.push({ name: 'Series', path: '/series', icon: Tv });
    } else if (path.includes('/public-domain')) {
      breadcrumbs.push({ name: 'Free Movies', path: '/public-domain', icon: Film });
    } else if (path.includes('/watchlist')) {
      breadcrumbs.push({ name: 'My Watchlist', path: '/watchlist', icon: Film });
    } else if (path.includes('/search')) {
      breadcrumbs.push({ name: 'Search', path: '/search', icon: Film });
    } else if (path.includes('/app-reviews')) {
      breadcrumbs.push({ name: 'Rate GamerGrid', path: '/app-reviews', icon: Film });
    } else if (path.includes('/settings')) {
      breadcrumbs.push({ name: 'Settings', path: '/settings', icon: Film });
    } else if (path.includes('/admin')) {
      breadcrumbs.push({ name: 'Admin Dashboard', path: '/admin', icon: Film });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="px-4 md:px-8 pt-20 pb-4">
      <div className="flex items-center gap-4">
        {/* Back Arrow Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => {
            const Icon = crumb.icon;
            const isLast = index === breadcrumbs.length - 1;

            return (
              <React.Fragment key={crumb.path}>
                <button
                  onClick={() => navigate(crumb.path)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                    isLast
                      ? 'text-white font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{crumb.name}</span>
                </button>
                {!isLast && <span className="text-gray-600">/</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BackNavigation;

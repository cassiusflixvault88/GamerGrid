import React, { useMemo } from 'react';
import { Trophy, ExternalLink } from 'lucide-react';

/**
 * Side-by-side price compare across PC stores (CheapShark) +
 * console retailers (Amazon, GameStop) from buy_links.
 * Auto-flags the cheapest live offer as BEST DEAL.
 */
const PriceCompare = ({ deals = [], buyLinks = [], loading = false }) => {
  const rows = useMemo(() => {
    const out = [];
    // PC store deals with real prices
    for (const d of deals) {
      if (!d || !d.sale_price) continue;
      out.push({
        key: `cs-${d.store_id}`,
        store: d.store_name || 'Store',
        price: Number(d.sale_price),
        normal: d.is_on_sale ? Number(d.normal_price) : null,
        savings: d.is_on_sale ? Math.round(d.savings_pct) : 0,
        url: d.deal_url,
        kind: 'pc',
      });
    }
    // Affiliate retailers — no live price (linked only), but still earn commission
    const retailerLabels = {
      amazon: 'Amazon',
      gamestop: 'GameStop',
      psn: 'PlayStation Store',
      xbox: 'Xbox Store',
      nintendo: 'Nintendo eShop',
    };
    for (const b of buyLinks) {
      if (!b || !b.kind) continue;
      if (!retailerLabels[b.kind]) continue;
      out.push({
        key: `bl-${b.kind}`,
        store: retailerLabels[b.kind] || b.label,
        price: null, // no live price for these
        normal: null,
        savings: 0,
        url: b.url,
        kind: b.kind,
      });
    }
    // Sort: priced rows first (cheapest first), then unpriced retailers
    out.sort((a, b) => {
      if (a.price != null && b.price == null) return -1;
      if (a.price == null && b.price != null) return 1;
      if (a.price != null && b.price != null) return a.price - b.price;
      return 0;
    });
    return out;
  }, [deals, buyLinks]);

  if (loading && rows.length === 0) {
    return (
      <div className="pt-4" data-testid="price-compare-loading">
        <p className="text-white/50 text-sm flex items-center gap-2">
          💰 Comparing prices across stores
          <span className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </p>
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="pt-4" data-testid="price-compare">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white text-base font-bold flex items-center gap-2">
          💰 Best Prices Right Now
        </p>
        <span className="text-[10px] text-white/40">Live · Affiliate-supported</span>
      </div>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        {rows.slice(0, 8).map((r, i) => {
          const isBest = i === 0 && r.price != null;
          return (
            <a
              key={r.key}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-testid={`price-row-${r.key}`}
              className={`flex items-center justify-between gap-3 px-4 py-3 transition-all border-b last:border-b-0 ${
                isBest
                  ? 'bg-gradient-to-r from-green-500/15 via-emerald-500/10 to-transparent border-green-500/30 hover:from-green-500/25'
                  : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isBest ? (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/30 text-green-200 text-[10px] font-bold uppercase tracking-wider">
                    <Trophy className="w-3 h-3" /> Best Deal
                  </span>
                ) : (
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-white/30" />
                )}
                <span className="text-white font-semibold truncate">{r.store}</span>
                {r.savings > 0 && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-red-600/30 border border-red-500/40 text-red-200 text-[10px] font-bold">
                    -{r.savings}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {r.price != null ? (
                  <>
                    <span className={`text-base font-extrabold ${isBest ? 'text-green-300' : 'text-white'}`}>
                      ${r.price.toFixed(2)}
                    </span>
                    {r.normal != null && (
                      <span className="text-white/40 text-xs line-through">${r.normal.toFixed(2)}</span>
                    )}
                  </>
                ) : (
                  <span className="text-white/60 text-sm">Check price</span>
                )}
                <ExternalLink className="w-3.5 h-3.5 text-white/40" />
              </div>
            </a>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-white/30">
        Prices update every 2 hours. We may earn a small commission from purchases — costs you nothing extra.
      </p>
    </div>
  );
};

export default PriceCompare;

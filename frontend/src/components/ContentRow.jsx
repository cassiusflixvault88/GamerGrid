import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from './ContentCard';
import { Button } from './ui/button';

const ContentRow = ({ title, items, onCardClick }) => {
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.offsetWidth * 0.8;
    const newScrollLeft =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setShowLeftArrow(container.scrollLeft > 0);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.offsetWidth - 10
    );
  };

  return (
    <div className="relative group mb-12">
      <h2 className="text-2xl font-bold text-white mb-4 px-6 lg:px-12">{title}</h2>
      
      <div className="relative px-6 lg:px-12">
        {showLeftArrow && (
          <Button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black/90 text-white p-2 h-full rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
            variant="ghost"
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex space-x-2 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <ContentCard key={item.id} content={item} onClick={onCardClick} />
          ))}
        </div>

        {showRightArrow && (
          <Button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black/90 text-white p-2 h-full rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
            variant="ghost"
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ContentRow;

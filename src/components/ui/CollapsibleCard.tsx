import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleCard({ title, children, defaultExpanded = true }: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    console.log(`Toggling ${title}: ${isExpanded} -> ${!isExpanded}`);
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'border-b border-gray-100' : ''}`}
        onClick={handleToggle}
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button 
          type="button"
          className="text-gray-500 hover:text-gray-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-6">
          {children}
        </div>
      )}
    </div>
  );
}


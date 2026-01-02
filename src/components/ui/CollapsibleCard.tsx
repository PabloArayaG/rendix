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
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden transition-all duration-300 ease-in-out">
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${isExpanded ? 'border-b border-gray-100' : ''}`}
        onClick={handleToggle}
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button 
          type="button"
          className="text-gray-500 hover:text-gray-700 transition-all duration-200 hover:scale-110"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-180'}`}>
            <ChevronUp className="h-5 w-5" />
          </div>
        </button>
      </div>
      
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isExpanded 
            ? 'max-h-[1000px] opacity-100 transform scale-100' 
            : 'max-h-0 opacity-0 transform scale-95'
        }`}
        style={{ overflow: isExpanded ? 'visible' : 'hidden' }}
      >
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}


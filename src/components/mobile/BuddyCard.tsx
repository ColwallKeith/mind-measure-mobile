import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

interface BuddyCardProps {
  buddy: {
    id: string;
    name: string;
    phone: string;
    email: string;
    rank: number;
  };
  onDelete: (id: string) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onAskCheckIn: (id: string) => void;
  index: number;
}

const ITEM_TYPE = 'BUDDY_CARD';

export function BuddyCard({ buddy, onDelete, onMove, onAskCheckIn, index }: BuddyCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (item: { index: number }) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        marginBottom: '12px',
        position: 'relative',
        border: '1px solid #F0F0F0',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <button
        onClick={() => onDelete(buddy.id)}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'transparent',
          border: 'none',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          fontSize: '20px',
          cursor: 'pointer',
          color: '#94A3B8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        aria-label="Delete buddy"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#FEE2E2';
          e.currentTarget.style.color = '#DC2626';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#94A3B8';
        }}
      >
        ×
      </button>

      <div style={{ width: '100%', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            backgroundColor: '#5B8FED',
            color: 'white',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '600',
            flexShrink: 0
          }}>
            {buddy.rank}
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0F172A', margin: 0, flex: 1 }}>
            {buddy.name}
          </h3>
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#10B981',
            backgroundColor: '#D1FAE5',
            padding: '4px 10px',
            borderRadius: '12px'
          }}>
            Active
          </span>
        </div>
      </div>

      <button
        onClick={() => onAskCheckIn(buddy.id)}
        style={{
          width: '320px',
          padding: '14px 20px',
          backgroundColor: '#5B8FED',
          border: 'none',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: '600',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4A7FDC'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#5B8FED'; }}
      >
        Send a nudge
      </button>
    </div>
  );
}

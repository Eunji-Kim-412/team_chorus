'use client'

type Conversation = {
  id: string
  title: string
  date: string
}

type Props = {
  history: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export default function Sidebar({ history, activeId, onSelect, onNew }: Props) {
  return (
    <aside
      className="flex flex-col shrink-0 w-52 h-screen"
      style={{ borderRight: '1px solid #1e1e1e', background: '#0a0a0a' }}
    >
      {/* 로고 */}
      <div className="px-4 pt-5 pb-3">
        <span className="text-base font-semibold tracking-tight" style={{ color: '#e8e8e8' }}>
          PawSori
        </span>
      </div>

      {/* 새 대화 버튼 */}
      <div className="px-3 pb-3">
        <button
          onClick={onNew}
          className="w-full text-xs px-3 py-2 rounded-lg text-left transition-all cursor-pointer"
          style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }}
        >
          + 새 대화
        </button>
      </div>

      {/* 대화 목록 */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {history.length === 0 && (
          <p className="text-xs px-2 py-3" style={{ color: '#333' }}>
            아직 대화 기록이 없어요
          </p>
        )}
        {history.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className="w-full text-left px-3 py-2.5 rounded-lg text-xs leading-snug transition-all cursor-pointer"
            style={{
              background: conv.id === activeId ? '#1e1e1e' : 'transparent',
              color: conv.id === activeId ? '#e0e0e0' : '#555',
              border: conv.id === activeId ? '1px solid #2a2a2a' : '1px solid transparent',
            }}
          >
            <p className="line-clamp-2 mb-1">{conv.title}</p>
            <p style={{ color: '#333', fontSize: '10px' }}>{conv.date}</p>
          </button>
        ))}
      </div>
    </aside>
  )
}

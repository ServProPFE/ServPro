import { useRealtimeContext } from '../context/RealtimeContext';

const RealtimeStatus = () => {
  const { isConnected } = useRealtimeContext();

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <span className={`text-xs font-semibold ${isConnected ? 'text-emerald-600' : 'text-slate-600'}`}>
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
};

export default RealtimeStatus;

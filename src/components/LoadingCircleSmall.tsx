import './loading-circle-small.css'
export default function LoadingCircleSmall({ className }: { className?: string }) {
  return (
    <div className={`lds-roller-sm ${className ?? ''}`} style={{margin: 'auto'}}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  )
}

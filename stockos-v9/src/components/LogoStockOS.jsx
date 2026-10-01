export default function LogoStockOS({ height = 72 }) {
  return (
    <img 
      src="/logo.png" 
      alt="STOCKOS" 
      style={{height, width:'auto'}} 
      className="object-contain mx-auto block select-none"
      draggable={false}
      onError={(e)=>e.target.style.display='none'}
    />
  )
}

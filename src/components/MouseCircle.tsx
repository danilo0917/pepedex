import { useEffect } from 'react';

const MouseCircle = () => {
  useEffect(() => {
    const circle = document.querySelector('.circle') as HTMLDivElement;

    document.addEventListener('mousemove', (e: MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      circle.style.left = `${mouseX}px`;
      circle.style.top = `${mouseY}px`;
    });

    // Clean up event listener when component unmounts
    return () => {
      document.removeEventListener('mousemove', (e: MouseEvent) => { });
    };
  }, []);

  return <div className="circle" />;
};

export default MouseCircle;
import React from 'react';

interface VideoWrapperProps {
  src: string;
  className?: string;
  containerClassName?: string;
  poster?: string;
}

export const VideoWrapper: React.FC<VideoWrapperProps> = ({
  src,
  className = '',
  containerClassName = '',
  poster,
}) => {
  return (
    <div
      className={`aspect-square w-full bg-white flex items-center justify-center rounded-[32px] overflow-hidden border border-primary/2 select-none ${containerClassName}`}
    >
      <video
        src={src}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        controls={false}
        className={`w-[90%] h-[90%] object-contain mix-blend-multiply ${className}`}
      />
    </div>
  );
};

"use client";

import React from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import Image from "next/image";

interface Ad {
  _id: string;
  name: string;
  image: string;
}

interface AdCarouselProps {
  ads: Ad[];
}

const AdCarousel: React.FC<AdCarouselProps> = ({ ads }) => {
  return (
    <Carousel
      showArrows={true}
      showThumbs={false}
      infiniteLoop={true}
      autoPlay={true}
      interval={5000}
      className="rounded-lg overflow-hidden"
    >
      {ads.map((ad) => (
        <div key={ad._id} className="relative aspect-video">
          <Image src={ad.image} alt={ad.name} layout="fill" objectFit="cover" />
          <p className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
            {ad.name}
          </p>
        </div>
      ))}
    </Carousel>
  );
};

export default AdCarousel;

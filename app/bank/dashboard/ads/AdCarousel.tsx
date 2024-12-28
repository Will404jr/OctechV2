import React from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import Image from "next/image";

interface Ad {
  _id: string;
  name: string;
  image: string;
  branchId: string;
}

interface AdCarouselProps {
  ads: Ad[];
  branches: { _id: string; name: string }[];
}

const AdCarousel: React.FC<AdCarouselProps> = ({ ads, branches }) => {
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
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
            <p>{ad.name}</p>
            <p className="text-sm">
              Branch:{" "}
              {branches.find((branch) => branch._id === ad.branchId)?.name ||
                "Unknown"}
            </p>
          </div>
        </div>
      ))}
    </Carousel>
  );
};

export default AdCarousel;

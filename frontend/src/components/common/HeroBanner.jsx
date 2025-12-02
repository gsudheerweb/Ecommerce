import { Box, Typography, Button } from "@mui/material";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";

const slides = [
  {
    title: "Create Beautiful Websites Easily",
    subtitle: "High-quality templates ready to use",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
    button: "Get Started",
  },
  {
    title: "Build Anything Faster",
    subtitle: "No coding required, just drag & drop",
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3",
    button: "Explore Templates",
  },
  {
    title: "Professionally Designed Layouts",
    subtitle: "Start your website in minutes",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    button: "Download Now",
  },
];

export default function HeroBanner() {
  return (
    <Swiper
      modules={[Autoplay, Pagination, EffectFade]}
      autoplay={{ delay: 3000 }}
      pagination={{ clickable: true }}
      effect="fade"
      loop
      style={{ width: "100%", height: "100%" }}
    >
      {slides.map((slide, index) => (
        <SwiperSlide key={index}>
          {/* Background image */}
          <Box
            sx={{
              height: "100vh", // FULL SCREEN HEIGHT
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              color: "#fff",
            }}
          >
            {/* Dark overlay */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
              }}
            />

            {/* Text Content */}
            <Box sx={{ position: "relative", zIndex: 2, px: 2 }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {slide.title}
              </Typography>

              <Typography variant="h6" sx={{ mt: 2 }}>
                {slide.subtitle}
              </Typography>

              <Button
                variant="contained"
                sx={{
                  mt: 3,
                  background: "#FFD014",
                  color: "#000",
                  fontWeight: 600,
                  px: 4,
                  py: 1.2,
                  borderRadius: 3,
                }}
              >
                {slide.button} →
              </Button>
            </Box>
          </Box>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

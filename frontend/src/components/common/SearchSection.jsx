import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";

const templates = [
  { id: 1, title: "Cakes & Tarts", img: "https://via.placeholder.com/300x200" },
  {
    id: 2,
    title: "Beauty Pronounced",
    img: "https://via.placeholder.com/300x200",
  },
  {
    id: 3,
    title: "Business Coach",
    img: "https://via.placeholder.com/300x200",
  },
];

export default function SearchSection() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>
        Popular Templates
      </Typography>

      <Grid container spacing={3}>
        {templates.map((item) => (
          <Grid key={item.id} item xs={12} sm={6} md={4}>
            <Card sx={{ borderRadius: 3 }}>
              <CardMedia component="img" height="180" image={item.img} />
              <CardContent>
                <Typography variant="h6">{item.title}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

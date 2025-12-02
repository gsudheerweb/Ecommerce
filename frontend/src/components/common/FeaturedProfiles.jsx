import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
} from "@mui/material";

const profiles = [
  {
    name: "Anjali Sharma",
    age: 26,
    location: "Mumbai",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    name: "Priya Verma",
    age: 24,
    location: "Delhi",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    name: "Rohit Singh",
    age: 28,
    location: "Bangalore",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    name: "Vikas Kumar",
    age: 29,
    location: "Chennai",
    image: "https://randomuser.me/api/portraits/men/45.jpg",
  },
];

export default function FeaturedProfiles() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Featured Profiles
      </Typography>

      <Grid container spacing={3}>
        {profiles.map((profile, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardMedia component="img" height="180" image={profile.image} />
              <CardContent>
                <Typography variant="h6">{profile.name}</Typography>
                <Typography variant="body2">Age: {profile.age}</Typography>
                <Typography variant="body2">
                  Location: {profile.location}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

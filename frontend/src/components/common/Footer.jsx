import { Box, Typography } from "@mui/material";

export default function Footer() {
  return (
    <Box
      sx={{
        bgcolor: "#5B16F3",
        color: "#fff",
        textAlign: "center",
        py: 3,
        mt: 5,
      }}
    >
      <Typography>
        © {new Date().getFullYear()} Astra — All Rights Reserved
      </Typography>
    </Box>
  );
}

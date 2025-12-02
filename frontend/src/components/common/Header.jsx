import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function Header() {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="fixed" sx={{ background: "#6a00ff" }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* Logo */}
        <Typography variant="h5" fontWeight={700}>
          ASTRA
        </Typography>

        {/* Nav Items */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Button color="inherit">Starter Templates</Button>

          {/* Dropdown Trigger */}
          <Button
            color="inherit"
            endIcon={<ExpandMoreIcon />}
            onMouseEnter={handleOpen}
            onClick={handleOpen}
          >
            Resources
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            MenuListProps={{
              onMouseLeave: handleClose,
            }}
            PaperProps={{
              sx: {
                width: 200,
                padding: 2,
                borderRadius: 2,
                boxShadow: 5,
              },
            }}
          >
            <MenuItem onClick={handleClose}>About</MenuItem>
            <MenuItem onClick={handleClose}>Blog</MenuItem>
            <MenuItem onClick={handleClose}>Knowledge Base</MenuItem>
            <MenuItem onClick={handleClose}>What’s New</MenuItem>
            <MenuItem onClick={handleClose}>Contact & Support</MenuItem>
            <MenuItem onClick={handleClose}>Login to Account</MenuItem>
          </Menu>

          <Button color="inherit">Pricing</Button>

          <Button
            variant="outlined"
            sx={{ borderColor: "#fff", color: "#fff" }}
          >
            GET STARTED
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

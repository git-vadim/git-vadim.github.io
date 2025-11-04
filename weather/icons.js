const weatherIcons = {
  0: {
    day: {
      description: "Sunny",
      image: "./img/wn/01d@2x.png",
      backgroundColor: "#FFE87C", // Brighter yellow for sunny
    },
    night: {
      description: "Clear",
      image: "./img/wn/01n@2x.png",
      backgroundColor: "#1A2530", // Deeper blue for clear night
    },
  },
  1: {
    day: {
      description: "Mainly Sunny",
      image: "./img/wn/01d@2x.png",
      backgroundColor: "#FFF1B5", // Softer yellow for mainly sunny
    },
    night: {
      description: "Mainly Clear",
      image: "./img/wn/01n@2x.png",
      backgroundColor: "#233240", // Rich dark blue for mainly clear night
    },
  },
  2: {
    day: {
      description: "Partly Cloudy",
      image: "./img/wn/02d@2x.png",
      backgroundColor: "#E6EEF2", // Light blue-gray for partly cloudy
    },
    night: {
      description: "Partly Cloudy",
      image: "./img/wn/02n@2x.png",
      backgroundColor: "#2C3840", // Deep blue-gray for night clouds
    },
  },
  3: {
    day: {
      description: "Cloudy",
      image: "./img/wn/03d@2x.png",
      backgroundColor: "#CBD7DE", // Medium blue-gray for full clouds
    },
    night: {
      description: "Cloudy",
      image: "./img/wn/03n@2x.png",
      backgroundColor: "#404B52", // Darker blue-gray for night clouds
    },
  },
  45: {
    day: {
      description: "Foggy",
      image: "./img/wn/50d@2x.png",
      backgroundColor: "#E8ECEC", // Whiter tint for fog
    },
    night: {
      description: "Foggy",
      image: "./img/wn/50n@2x.png",
      backgroundColor: "#6E7A7A", // Muted gray for night fog
    },
  },
  48: {
    day: {
      description: "Rime Fog",
      image: "./img/wn/50d@2x.png",
      backgroundColor: "#E8F3F1", // Ice-white tint for rime
    },
    night: {
      description: "Rime Fog",
      image: "./img/wn/50n@2x.png",
      backgroundColor: "#728C88", // Muted blue-gray for night rime
    },
  },
  51: {
    day: {
      description: "Light Drizzle",
      image: "./img/wn/09d@2x.png",
      backgroundColor: "#C4E3F3", // Very light blue for drizzle
    },
    night: {
      description: "Light Drizzle",
      image: "./img/wn/09n@2x.png",
      backgroundColor: "#4A7285", // Muted blue for night drizzle
    },
  },
  53: {
    day: {
      description: "Drizzle",
      image: "./img/wn/09d@2x.png",
      backgroundColor: "#A8D4EC", // Light blue for drizzle
    },
    night: {
      description: "Drizzle",
      image: "./img/wn/09n@2x.png",
      backgroundColor: "#385E73", // Darker blue for night drizzle
    },
  },
  55: {
    day: {
      description: "Heavy Drizzle",
      image: "./img/wn/09d@2x.png",
      backgroundColor: "#8BC4E5", // Medium blue for heavy drizzle
    },
    night: {
      description: "Heavy Drizzle",
      image: "./img/wn/09n@2x.png",
      backgroundColor: "#264A61", // Deep blue for night heavy drizzle
    },
  },
  56: {
    day: {
      description: "Light Freezing Drizzle",
      image: "./img/wn/09d@2x.png",
      backgroundColor: "#D1E5F6", // Ice blue tint for freezing
    },
    night: {
      description: "Light Freezing Drizzle",
      image: "./img/wn/09n@2x.png",
      backgroundColor: "#5A7A8C", // Muted ice blue for night
    },
  },
  57: {
    day: {
      description: "Freezing Drizzle",
      image: "./img/wn/09d@2x.png",
      backgroundColor: "#B8DFF5", // Deeper ice blue for freezing
    },
    night: {
      description: "Freezing Drizzle",
      image: "./img/wn/09n@2x.png",
      backgroundColor: "#456B80", // Dark ice blue for night
    },
  },
  61: {
    day: {
      description: "Light Rain",
      image: "./img/wn/10d@2x.png",
      backgroundColor: "#7CB9E8", // Clear blue for light rain
    },
    night: {
      description: "Light Rain",
      image: "./img/wn/10n@2x.png",
      backgroundColor: "#2C5C7C", // Deep blue for night rain
    },
  },
  63: {
    day: {
      description: "Rain",
      image: "./img/wn/10d@2x.png",
      backgroundColor: "#5BA3DB", // Medium blue for rain
    },
    night: {
      description: "Rain",
      image: "./img/wn/10n@2x.png",
      backgroundColor: "#1F4866", // Darker blue for night rain
    },
  },
  65: {
    day: {
      description: "Heavy Rain",
      image: "./img/wn/10d@2x.png",
      backgroundColor: "#1A5D8F", // Deep blue for heavy rain
    },
    night: {
      description: "Heavy Rain",
      image: "./img/wn/10n@2x.png",
      backgroundColor: "#0F3452", // Very dark blue for night heavy rain
    },
  },
  66: {
    day: {
      description: "Light Freezing Rain",
      image: "./img/wn/10d@2x.png",
      backgroundColor: "#C5E3F6", // Light ice blue for freezing rain
    },
    night: {
      description: "Light Freezing Rain",
      image: "./img/wn/10n@2x.png",
      backgroundColor: "#567B8C", // Muted ice blue for night
    },
  },
  67: {
    day: {
      description: "Freezing Rain",
      image: "./img/wn/10d@2x.png",
      backgroundColor: "#A8D1F0", // Ice blue for freezing rain
    },
    night: {
      description: "Freezing Rain",
      image: "./img/wn/10n@2x.png",
      backgroundColor: "#3D5C6B", // Dark ice blue for night
    },
  },
  71: {
    day: {
      description: "Light Snow",
      image: "./img/wn/13d@2x.png",
      backgroundColor: "#E8F1F8", // Very light blue-white for light snow
    },
    night: {
      description: "Light Snow",
      image: "./img/wn/13n@2x.png",
      backgroundColor: "#8FA5B2", // Muted blue-white for night snow
    },
  },
  73: {
    day: {
      description: "Snow",
      image: "./img/wn/13d@2x.png",
      backgroundColor: "#D4E6F1", // Light blue-white for snow
    },
    night: {
      description: "Snow",
      image: "./img/wn/13n@2x.png",
      backgroundColor: "#6B8799", // Darker blue-white for night snow
    },
  },
  75: {
    day: {
      description: "Heavy Snow",
      image: "./img/wn/13d@2x.png",
      backgroundColor: "#BED8E8", // Medium blue-white for heavy snow
    },
    night: {
      description: "Heavy Snow",
      image: "./img/wn/13n@2x.png",
      backgroundColor: "#4D697A", // Deep blue-white for night snow
    },
  },
  77: {
    day: {
      description: "Snow Grains",
      image: "./img/wn/13d@2x.png",
      backgroundColor: "#DCE7ED", // Bright white-blue for snow grains
    },
    night: {
      description: "Snow Grains",
      image: "./img/wn/13n@2x.png",
      backgroundColor: "#7A8A94", // Muted white-blue for night
    },
  },
  80: {
    day: {
      description: "Light Showers",
      image: "./img/wn/09d@2x.png",
      backgroundColor: "#93C6E7", // Bright blue for light showers
    },
    night: {
      description: "Light Showers",
      image: "./img/wn/09n@2x.png",
      backgroundColor: "#3D6B8A", // Deep blue for night showers
    },
  },
  81: {
    day: {
      description: "Showers",
      image: "./img/wn/09d@2x.png",
      backgroundColor: "#6FB1E4", // Medium bright blue for showers
    },
    night: {
      description: "Showers",
      image: "./img/wn/09n@2x.png",
      backgroundColor: "#2C5573", // Darker blue for night showers
    },
  },
  82: {
    day: {
      description: "Heavy Showers",
      image: "./img/wn/09d@2x.png",
      backgroundColor: "#4B9BE1", // Deep bright blue for heavy showers
    },
    night: {
      description: "Heavy Showers",
      image: "./img/wn/09n@2x.png",
      backgroundColor: "#1B3F5C", // Very dark blue for night showers
    },
  },
  85: {
    day: {
      description: "Light Snow Showers",
      image: "./img/wn/13d@2x.png",
      backgroundColor: "#E1EDF6", // Very light blue-white for snow showers
    },
    night: {
      description: "Light Snow Showers",
      image: "./img/wn/13n@2x.png",
      backgroundColor: "#8799A3", // Muted blue-white for night
    },
  },
  86: {
    day: {
      description: "Snow Showers",
      image: "./img/wn/13d@2x.png",
      backgroundColor: "#C7DEF0", // Light blue-white for snow showers
    },
    night: {
      description: "Snow Showers",
      image: "./img/wn/13n@2x.png",
      backgroundColor: "#5F7A8C", // Darker blue-white for night
    },
  },
  95: {
    day: {
      description: "Thunderstorm",
      image: "./img/wn/11d@2x.png",
      backgroundColor: "#6C7C91", // Steel blue for thunderstorm
    },
    night: {
      description: "Thunderstorm",
      image: "./img/wn/11n@2x.png",
      backgroundColor: "#2C3440", // Very dark steel blue for night
    },
  },
  96: {
    day: {
      description: "Light Thunderstorms With Hail",
      image: "./img/wn/11d@2x.png",
      backgroundColor: "#78889E", // Lighter steel blue for light thunderstorm
    },
    night: {
      description: "Light Thunderstorms With Hail",
      image: "./img/wn/11n@2x.png",
      backgroundColor: "#363E4A", // Dark steel blue for night
    },
  },
  99: {
    day: {
      description: "Thunderstorm With Hail",
      image: "./img/wn/11d@2x.png",
      backgroundColor: "#596573", // Dark steel blue for severe thunderstorm
    },
    night: {
      description: "Thunderstorm With Hail",
      image: "./img/wn/11n@2x.png",
      backgroundColor: "#272C33", // Very dark steel blue for night
    },
  },
};

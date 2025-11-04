const weatherIcons = {
  0: {
    day: {
      description: "Sunny",
      image: "../img/wn/01d@2x.png",
      backgroundColor: "#FCE883", // Light Yellow (for sunny)
    },
    night: {
      description: "Clear",
      image: "../img/wn/01n@2x.png",
      backgroundColor: "#2C3E50", // Dark Blue (for clear night)
    },
  },
  1: {
    day: {
      description: "Mainly Sunny",
      image: "../img/wn/01d@2x.png",
      backgroundColor: "#F9E79F", // Slightly less intense yellow
    },
    night: {
      description: "Mainly Clear",
      image: "../img/wn/01n@2x.png",
      backgroundColor: "#34495E", // Slightly lighter dark blue
    },
  },
  2: {
    day: {
      description: "Partly Cloudy",
      image: "../img/wn/02d@2x.png",
      backgroundColor: "#E5E8E8", // Very Light Gray
    },
    night: {
      description: "Partly Cloudy",
      image: "../img/wn/02n@2x.png",
      backgroundColor: "#424949", // Darker Gray
    },
  },
  3: {
    day: {
      description: "Cloudy",
      image: "../img/wn/03d@2x.png",
      backgroundColor: "#CCD1D1", // Medium Gray
    },
    night: {
      description: "Cloudy",
      image: "../img/wn/03n@2x.png",
      backgroundColor: "#616A6B", // Dark Gray
    },
  },
  45: {
    day: {
      description: "Foggy",
      image: "../img/wn/50d@2x.png",
      backgroundColor: "#D5DBDB", // Very Light Gray (misty/fog)
    },
    night: {
      description: "Foggy",
      image: "../img/wn/50n@2x.png",
      backgroundColor: "#909497", // Dark Gray
    },
  },
  48: {
    day: {
      description: "Rime Fog",
      image: "../img/wn/50d@2x.png",
      backgroundColor: "#D0ECE7", // Light Gray/Blue
    },
    night: {
      description: "Rime Fog",
      image: "../img/wn/50n@2x.png",
      backgroundColor: "#A6ACAF", // Dark Gray/Blue
    },
  },
  51: {
    day: {
      description: "Light Drizzle",
      image: "../img/wn/09d@2x.png",
      backgroundColor: "#AED6F1", // Light Blue
    },
    night: {
      description: "Light Drizzle",
      image: "../img/wn/09n@2x.png",
      backgroundColor: "#5499C7", // Medium Blue
    },
  },
  53: {
    day: {
      description: "Drizzle",
      image: "../img/wn/09d@2x.png",
      backgroundColor: "#85C1E9", // Medium Light Blue
    },
    night: {
      description: "Drizzle",
      image: "../img/wn/09n@2x.png",
      backgroundColor: "#2E86C1", // Medium Blue
    },
  },
  55: {
    day: {
      description: "Heavy Drizzle",
      image: "../img/wn/09d@2x.png",
      backgroundColor: "#5DADE2", // Slightly Darker Blue
    },
    night: {
      description: "Heavy Drizzle",
      image: "../img/wn/09n@2x.png",
      backgroundColor: "#21618C", // Darker Blue
    },
  },
  56: {
    day: {
      description: "Light Freezing Drizzle",
      image: "../img/wn/09d@2x.png",
      backgroundColor: "#D6EAF8", // Light Blue/Gray
    },
    night: {
      description: "Light Freezing Drizzle",
      image: "../img/wn/09n@2x.png",
      backgroundColor: "#85929E", // Dark Gray
    },
  },
  57: {
    day: {
      description: "Freezing Drizzle",
      image: "../img/wn/09d@2x.png",
      backgroundColor: "#A9CCE3", // Medium Blue/Gray
    },
    night: {
      description: "Freezing Drizzle",
      image: "../img/wn/09n@2x.png",
      backgroundColor: "#4A6980", // Dark Gray
    },
  },
  61: {
    day: {
      description: "Light Rain",
      image: "../img/wn/10d@2x.png",
      backgroundColor: "#85C1E9", // Light Blue (rainy)
    },
    night: {
      description: "Light Rain",
      image: "../img/wn/10n@2x.png",
      backgroundColor: "#2E86C1", // Medium Blue
    },
  },
  63: {
    day: {
      description: "Rain",
      image: "../img/wn/10d@2x.png",
      backgroundColor: "#5DADE2", // Medium Blue (more intense rain)
    },
    night: {
      description: "Rain",
      image: "../img/wn/10n@2x.png",
      backgroundColor: "#21618C", // Dark Blue
    },
  },
  65: {
    day: {
      description: "Heavy Rain",
      image: "../img/wn/10d@2x.png",
      backgroundColor: "#2980B9", // Dark Blue (heavy rain)
    },
    night: {
      description: "Heavy Rain",
      image: "../img/wn/10n@2x.png",
      backgroundColor: "#1B4F72", // Very Dark Blue
    },
  },
  66: {
    day: {
      description: "Light Freezing Rain",
      image: "../img/wn/10d@2x.png",
      backgroundColor: "#D6EAF8", // Light Blue/Gray
    },
    night: {
      description: "Light Freezing Rain",
      image: "../img/wn/10n@2x.png",
      backgroundColor: "#85929E", // Dark Gray
    },
  },
  67: {
    day: {
      description: "Freezing Rain",
      image: "../img/wn/10d@2x.png",
      backgroundColor: "#A9CCE3", // Medium Blue/Gray
    },
    night: {
      description: "Freezing Rain",
      image: "../img/wn/10n@2x.png",
      backgroundColor: "#4A6980", // Dark Gray
    },
  },
  71: {
    day: {
      description: "Light Snow",
      image: "../img/wn/13d@2x.png",
      backgroundColor: "#D4E6F1", // Very Light Blue (snow)
    },
    night: {
      description: "Light Snow",
      image: "../img/wn/13n@2x.png",
      backgroundColor: "#A3B4BD", // Medium Blue/Gray
    },
  },
  73: {
    day: {
      description: "Snow",
      image: "../img/wn/13d@2x.png",
      backgroundColor: "#A9CCE3", // Medium Light Blue (more snow)
    },
    night: {
      description: "Snow",
      image: "../img/wn/13n@2x.png",
      backgroundColor: "#647580", // Dark Blue/Gray
    },
  },
  75: {
    day: {
      description: "Heavy Snow",
      image: "../img/wn/13d@2x.png",
      backgroundColor: "#85929E", // Medium Gray Blue (heavy snow)
    },
    night: {
      description: "Heavy Snow",
      image: "../img/wn/13n@2x.png",
      backgroundColor: "#34495E", // Dark Blue/Gray
    },
  },
  77: {
    day: {
      description: "Snow Grains",
      image: "../img/wn/13d@2x.png",
      backgroundColor: "#BDC3C7", // Light Gray
    },
    night: {
      description: "Snow Grains",
      image: "../img/wn/13n@2x.png",
      backgroundColor: "#839192", // Medium Gray
    },
  },
  80: {
    day: {
      description: "Light Showers",
      image: "../img/wn/09d@2x.png",
      backgroundColor: "#AED6F1", // Light Blue (showers)
    },
    night: {
      description: "Light Showers",
      image: "../img/wn/09n@2x.png",
      backgroundColor: "#5499C7", // Medium Blue
    },
  },
  81: {
    day: {
      description: "Showers",
      image: "../img/wn/09d@2x.png",
      backgroundColor: "#85C1E9", // Medium Light Blue
    },
    night: {
      description: "Showers",
      image: "../img/wn/09n@2x.png",
      backgroundColor: "#2E86C1", // Medium Blue
    },
  },
  82: {
    day: {
      description: "Heavy Showers",
      image: "../img/wn/09d@2x.png",
      backgroundColor: "#5DADE2", // Slightly Darker Blue
    },
    night: {
      description: "Heavy Showers",
      image: "../img/wn/09n@2x.png",
      backgroundColor: "#21618C", // Darker Blue
    },
  },
  85: {
    day: {
      description: "Light Snow Showers",
      image: "../img/wn/13d@2x.png",
      backgroundColor: "#D4E6F1", // Very Light Blue (snow showers)
    },
    night: {
      description: "Light Snow Showers",
      image: "../img/wn/13n@2x.png",
      backgroundColor: "#A3B4BD", // Medium Blue/Gray
    },
  },
  86: {
    day: {
      description: "Snow Showers",
      image: "../img/wn/13d@2x.png",
      backgroundColor: "#A9CCE3", // Medium Light Blue (more snow showers)
    },
    night: {
      description: "Snow Showers",
      image: "../img/wn/13n@2x.png",
      backgroundColor: "#647580", // Dark Blue/Gray
    },
  },
  95: {
    day: {
      description: "Thunderstorm",
      image: "../img/wn/11d@2x.png",
      backgroundColor: "#B2BABB", //Dark Gray/white
    },
    night: {
      description: "Thunderstorm",
      image: "../img/wn/11n@2x.png",
      backgroundColor: "#424949", // Dark Gray
    },
  },
  96: {
    day: {
      description: "Light Thunderstorms With Hail",
      image: "../img/wn/11d@2x.png",
      backgroundColor: "#979A9A", //Light Gray/white
    },
    night: {
      description: "Light Thunderstorms With Hail",
      image: "../img/wn/11n@2x.png",
      backgroundColor: "#616A6B", // Dark Gray
    },
  },
  99: {
    day: {
      description: "Thunderstorm With Hail",
      image: "../img/wn/11d@2x.png",
      backgroundColor: "#707B7C", // Dark Gray
    },
    night: {
      description: "Thunderstorm With Hail",
      image: "../img/wn/11n@2x.png",
      backgroundColor: "#424949", // Dark Gray
    },
  },
};

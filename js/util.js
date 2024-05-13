function seededShuffle(array, seed) {
    const shuffledArray = [...array];
    let currentIndex = shuffledArray.length;
  
    // Use a seeded random number generator
    function seededRandom() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }
  
    while (currentIndex !== 0) {
      // Pick a random index
      const randomIndex = Math.floor(seededRandom() * currentIndex);
      currentIndex--;
  
      // Swap the current element with the random element
      const temporaryValue = shuffledArray[currentIndex];
      shuffledArray[currentIndex] = shuffledArray[randomIndex];
      shuffledArray[randomIndex] = temporaryValue;
    }
  
    return shuffledArray;
  }
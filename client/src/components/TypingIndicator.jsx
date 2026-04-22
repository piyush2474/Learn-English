import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg w-fit">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
          className="w-1.5 h-1.5 bg-gray-500 rounded-full"
        />
      ))}
    </div>
  );
};

export default TypingIndicator;

import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-3 rounded-2xl rounded-tl-sm bg-[#2f2f2f] w-fit animate-in fade-in zoom-in duration-300">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
          className="w-1.5 h-1.5 bg-gray-400 rounded-full"
        />
      ))}
    </div>
  );
};

export default TypingIndicator;

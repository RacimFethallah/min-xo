"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { FaSpinner } from "react-icons/fa";

export default function CreateRoomButton() {
  const router = useRouter();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  function generateRoomCode() {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        result += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }
      if (i < 2) result += "-";
    }
    return result;
  }

  const createRoom = () => {
    setIsCreatingRoom(true);
    const roomId = generateRoomCode();
    router.push(`/room/${roomId}`);
  };

  return (
    <button
      onClick={createRoom}
      disabled={isCreatingRoom}
      className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-4 w-full flex items-center justify-center ${
        isCreatingRoom ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {isCreatingRoom ? <FaSpinner className="animate-spin mr-2" /> : null}
      {isCreatingRoom ? "Creating..." : "Create Room"}
    </button>
  );
}

"use client"

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { toast } from "sonner";

export default function JoinRoomForm() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const roomCodeRegex = /^[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}$/;
    if (roomCode.trim() && roomCodeRegex.test(roomCode)) {
      setIsJoiningRoom(true);
      router.push(`/room/${roomCode}`);
    } else {
      toast.error("Please enter a valid room code (format: xxx-xxx-xxx)");
    }
  };
  return (
    <form onSubmit={joinRoom} className="flex flex-col items-center">
      <input
        type="text"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        placeholder="Enter Room Code"
        className=" text-black border border-gray-300 rounded px-3 py-2 mb-2 w-full"
      />
      <button
        type="submit"
        disabled={isJoiningRoom}
        className={`bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded w-full flex items-center justify-center ${
          isJoiningRoom ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isJoiningRoom ? <FaSpinner className="animate-spin mr-2" /> : null}
        {isJoiningRoom ? "Joining..." : "Join Room"}
      </button>
    </form>
  );
}

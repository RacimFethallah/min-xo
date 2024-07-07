"use client";

import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import React, { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";

export default function Room({ params }: { params: { roomId: string } }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [users, setUsers] = useState<{ key: string }[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);

  const supabase: SupabaseClient = createClient();

  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const calculateWinner = (board: Array<string | null>) => {
    for (let combination of winningCombinations) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return board.includes(null) ? null : "Draw";
  };

  const handleClick = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = board.slice();
    newBoard[index] = isXNext ? "X" : "O";
    setBoard(newBoard);
    setIsXNext(!isXNext);

    const gameWinner = calculateWinner(newBoard);
    setWinner(gameWinner);

    if (channel) {
      channel.send({
        type: "broadcast",
        event: "game_update",
        payload: { board: newBoard, isXNext: !isXNext, winner: gameWinner },
      });
    }
  };

  const renderSquare = (index: number) => (
    <button key={index} className="square" onClick={() => handleClick(index)}>
      {board[index]}
    </button>
  );

  const resetGame = () => {
    const newBoard = Array(9).fill(null);
    setBoard(newBoard);
    setIsXNext(true);
    setWinner(null);

    if (channel) {
      channel.send({
        type: "broadcast",
        event: "game_update",
        payload: { board: newBoard, isXNext: true, winner: null },
      });
    }
  };

  useEffect(() => {
    const setupChannel = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userKey = user?.id || `anonymous-${Date.now()}`;

      const roomChannel = supabase.channel(`room_${params.roomId}`, {
        config: {
          presence: {
            key: userKey,
          },
        },
      });

      roomChannel
        .on("presence", { event: "sync" }, () => {
          const newState = roomChannel.presenceState();
          console.log("sync", newState);
          const usersInRoom = Object.keys(newState).map((key) => ({
            key,
          }));
          setUsers(usersInRoom.slice(0, 2));
          setCurrentPlayer(userKey);
        })
        .on("presence", { event: "join" }, ({ key }) => {
          setUsers((prevUsers) => {
            const updatedUsers = [...prevUsers, { key }].slice(0, 2);
            if (updatedUsers.length <= 2) {
              toast.success(`User ${key} joined the room`);
            }
            return updatedUsers;
          });
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          setUsers((prevUsers) => prevUsers.filter((user) => user.key !== key));
          toast.error(`User ${key} left the room`);
        })
        .on("broadcast", { event: "game_update" }, ({ payload }) => {
          setBoard(payload.board);
          setIsXNext(payload.isXNext);
          setWinner(payload.winner);
        })
        // .subscribe();
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await roomChannel.track({ online_at: new Date().toISOString() });
          }
        });

      setChannel(roomChannel);
    };

    setupChannel();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [params.roomId]);

  const isYourTurn = currentPlayer === users[isXNext ? 0 : 1]?.key;

  return (
    <div className="p-16 flex flex-col items-center">
      <Toaster />
      <h1 className="text-2xl mb-4">Room: {params.roomId}</h1>
      <p className="mb-4">Players in room: {users.length} / 2</p>
      {users.length === 2 && (
        <p className="mb-4">{isYourTurn ? "Your turn" : "Opponent's turn"}</p>
      )}
      <div className="grid">{board.map((_, index) => renderSquare(index))}</div>
      {winner && (
        <div className="mt-10 flex flex-col justify-center items-center">
          {winner === "Draw" ? (
            <p className="text-xl">It's a draw!</p>
          ) : (
            <p className="text-2xl">{winner} wins!</p>
          )}
          <button
            className="mt-2 p-2 bg-blue-500 text-white rounded"
            onClick={resetGame}
          >
            Restart Game
          </button>
        </div>
      )}
    </div>
  );
}

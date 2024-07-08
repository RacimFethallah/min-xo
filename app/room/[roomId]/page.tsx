"use client";

import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { IoExitOutline } from "react-icons/io5";

export default function Room({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [users, setUsers] = useState<{ key: string; name: string }[]>([]);
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

  const logGameEvent = async (eventType: string, eventData: any) => {
    try {
      const { error } = await supabase.from("game_events").insert({
        room_id: params.roomId,
        event_type: eventType,
        event_data: eventData,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error logging game event:", error);
    }
  };

  const calculateWinner = (board: Array<string | null>) => {
    for (let combination of winningCombinations) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return board.includes(null) ? null : "Draw";
  };

  const handleClick = async (index: number) => {
    if (board[index] || winner || currentPlayer != users[isXNext ? 0 : 1]?.key)
      return;

    const newBoard = board.slice();
    newBoard[index] = isXNext ? "X" : "O";
    setBoard(newBoard);
    setIsXNext(!isXNext);

    const gameWinner = calculateWinner(newBoard);
    setWinner(gameWinner);

    await logGameEvent("player_move", {
      player: isXNext ? "X" : "O",
      position: index,
    });

    if (gameWinner) {
      await logGameEvent("game_end", { winner: gameWinner });
    }

    if (channel) {
      channel.send({
        type: "broadcast",
        event: "game_update",
        payload: { board: newBoard, isXNext: !isXNext, winner: gameWinner },
      });
    }
  };

  const renderSquare = (index: number) => (
    <button
      key={index}
      className={`square ${
        currentPlayer != users[isXNext ? 0 : 1]?.key ? "cursor-not-allowed" : ""
      }`}
      onClick={() => handleClick(index)}
    >
      {board[index]}
    </button>
  );

  const resetGame = async () => {
    const newBoard = Array(9).fill(null);
    setBoard(newBoard);
    setIsXNext(true);
    setWinner(null);

    await logGameEvent("game_reset", {});

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
      const username =
        user?.user_metadata.username || user?.email || "Anonymous";

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
          const usersInRoom = Object.entries(newState).map(([key, value]) => ({
            key,
            name: (value as any)[0]?.name || "Anonymous",
          }));
          if (usersInRoom.length > 2) {
            toast.error("Room is full. Redirecting to home...");
            router.push("/");
            return;
          }
          setUsers(usersInRoom);
          setCurrentPlayer(userKey);
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          setUsers((prevUsers) => {
            if (prevUsers.length >= 2) {
              toast.error("Room is full");
              return prevUsers;
            }
            const newUser = {
              key,
              name: (newPresences as any)[0]?.name || "Anonymous",
            };
            const updatedUsers = [...prevUsers, newUser];
            toast.success(`${newUser.name} joined the room`);

            logGameEvent("player_join", { player: newUser.name });

            return updatedUsers;
          });
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          setUsers((prevUsers) => {
            const leavingUser = prevUsers.find((user) => user.key === key);
            // toast.error(`${leavingUser?.name || "A player"} left the room`);

            if (leavingUser) {
              logGameEvent("player_leave", { player: leavingUser.name });
            }

            return prevUsers.filter((user) => user.key !== key);
          });
        })
        .on("broadcast", { event: "game_update" }, ({ payload }) => {
          setBoard(payload.board);
          setIsXNext(payload.isXNext);
          setWinner(payload.winner);
        })
        // .subscribe();
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await roomChannel.track({
              online_at: new Date().toISOString(),
              name: username,
            });
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
      <Link
        href="/"
        className="absolute left-8 top-8 py-2 px-4 rounded-md no-underline text-foreground bg-btn-background hover:bg-btn-background-hover flex items-center group text-sm"
      >
        <IoExitOutline
          size={32}
          className=" rotate-180 mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
        />{" "}
        Exit Room
      </Link>
      <h1 className="text-2xl mb-4">Room: {params.roomId}</h1>
      <p className="mb-4">Players in room: {users.length} / 2</p>
      {users.map((user, index) => (
        <p key={user.key} className="mb-2">
          Player {index + 1}: {user.name}{" "}
          {user.key === currentPlayer ? "(You)" : ""}
        </p>
      ))}
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

import { useRouter } from "next/navigation";
import AuthButton from "../components/AuthButton";
import { createClient } from "@/utils/supabase/server";
import { useState } from "react";
import { Toaster, toast } from "sonner";
import { FaSpinner } from "react-icons/fa";
import CreateRoomButton from "@/components/createRoomButton";
import JoinRoomForm from "@/components/joinRoomForm";

export default async function Index() {
  const canInitSupabaseClient = () => {
    try {
      createClient();
      return true;
    } catch (e) {
      return false;
    }
  };

  const supabase = canInitSupabaseClient();

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center">
      <Toaster />
      <nav className="w-full flex justify-end border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-4xl flex justify-end items-center pr-10 text-sm">
          {supabase && <AuthButton />}
        </div>
      </nav>

      <div className=" w-full h-full flex flex-col justify-center items-center">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Min-XO</h1>
          <CreateRoomButton />
          <div className="my-4">
            <p className="text-gray-600">- or -</p>
          </div>
          <JoinRoomForm />
        </div>
      </div>
    </div>
  );
}

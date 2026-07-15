"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Copy,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarDays,
  Search,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RoomBooking {
  id: string;
  name: string;
  email: string;
  duration: number;
  price: string;
  status: string;
  scheduledAt: string | null;
  roomName: string | null;
  roomUrl: string | null;
  createdAt: string;
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatPrice(price: string) {
  const num = parseFloat(price.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return price;
  return "₹" + num.toLocaleString("en-IN");
}

export default function AdminRoomsPanel() {
  const [rooms, setRooms] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rooms");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      setError("Failed to load rooms. Check server logs.");
      console.error("[AdminRoomsPanel] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreateRoom = async (bookingId: string, action: "create" | "regenerate" = "create") => {
    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create room");
        return;
      }
      // Refresh the list to show the new room
      await fetchRooms();
    } catch (err) {
      console.error("[AdminRoomsPanel] Create error:", err);
      alert("Failed to create room. Check the console for details.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyUrl = async (url: string, id: string) => {
    // Clear any existing timeout
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: select the text manually
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }

    setCopiedId(id);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Filter ─────────────────────────────────────────────────────
  const filteredRooms = rooms.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  // ─── Stats ──────────────────────────────────────────────────────
  const totalBookings = rooms.length;
  const withRooms = rooms.filter((r) => r.roomUrl).length;
  const withoutRooms = totalBookings - withRooms;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-[#0a0a0a] border-white/[0.04]">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-editorial text-sm text-[#f0eee9] tracking-wider flex items-center gap-2">
                <Video className="size-4 text-[#c9a96e]" />
                MEETING ROOMS
              </CardTitle>
              <CardDescription className="text-body-cinematic text-xs mt-1">
                Daily.co video rooms for upcoming sessions
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Stats pills */}
              <div className="flex items-center gap-2">
                <div className="bg-emerald-400/10 border border-emerald-400/20 rounded px-2 py-1 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-medium">{withRooms}</span>
                </div>
                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded px-2 py-1 flex items-center gap-1.5">
                  <AlertCircle className="size-3 text-yellow-400" />
                  <span className="text-yellow-400 text-[10px] font-medium">{withoutRooms}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRooms}
                disabled={loading}
                className="text-[#9a9a9a] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10 text-xs h-8"
              >
                <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#9a9a9a]" />
            <Input
              placeholder="Search by name, email or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-[#111] border-white/[0.06] text-[#e8e6e1] placeholder:text-[#555] w-full sm:w-72 focus:border-[#c9a96e]/30 focus:ring-[#c9a96e]/20"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-[#141414] rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="size-10 text-[#c0392b] mx-auto mb-3" />
              <p className="text-body-cinematic text-sm mb-4">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRooms}
                className="btn-outline-gold text-xs"
              >
                Retry
              </Button>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-12">
              <Video className="size-10 text-[#333] mx-auto mb-3" />
              <p className="text-body-cinematic text-sm">
                {searchQuery
                  ? "No bookings match your search."
                  : "No confirmed or completed bookings yet."}
              </p>
              <p className="text-[#555] text-xs mt-2">
                {!searchQuery && "Rooms are created automatically when a booking is confirmed."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.04] hover:bg-transparent">
                      <TableHead className="text-[#9a9a9a] text-xs font-medium">Client</TableHead>
                      <TableHead className="text-[#9a9a9a] text-xs font-medium">Session</TableHead>
                      <TableHead className="text-[#9a9a9a] text-xs font-medium">Room</TableHead>
                      <TableHead className="text-[#9a9a9a] text-xs font-medium">Status</TableHead>
                      <TableHead className="text-[#9a9a9a] text-xs font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredRooms.map((room, i) => (
                        <motion.tr
                          key={room.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.3, delay: i * 0.02 }}
                          className="border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                        >
                          <TableCell>
                            <div>
                              <p className="text-[#f0eee9] text-sm font-medium">{room.name}</p>
                              <p className="text-body-cinematic text-xs text-[#7a7a7a]">{room.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-body-cinematic text-xs">
                              <Clock className="size-3 text-[#555]" />
                              <span>{room.duration}min</span>
                              {room.scheduledAt && (
                                <>
                                  <span className="text-[#333]">·</span>
                                  <CalendarDays className="size-3 text-[#555]" />
                                  <span className="truncate max-w-36">{formatDateTime(room.scheduledAt)}</span>
                                </>
                              )}
                            </div>
                            <p className="text-[#c9a96e] text-xs mt-0.5">{formatPrice(room.price)}</p>
                          </TableCell>
                          <TableCell>
                            {room.roomUrl ? (
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-400/10 border-emerald-400/20 text-emerald-400 text-[10px]"
                                >
                                  <CheckCircle2 className="size-2.5 mr-1" />
                                  Ready
                                </Badge>
                                <span className="text-[10px] text-[#555] max-w-28 truncate hidden lg:inline">
                                  {room.roomName || "room"}
                                </span>
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-yellow-400/10 border-yellow-400/20 text-yellow-400 text-[10px]"
                              >
                                <AlertCircle className="size-2.5 mr-1" />
                                No room
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                room.status === "confirmed"
                                  ? "text-[#c9a96e] border-[#c9a96e]/20 bg-[#c9a96e]/10"
                                  : "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                              }`}
                            >
                              {room.status === "confirmed" ? "Confirmed" : "Completed"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {room.roomUrl ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] text-[#9a9a9a] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10"
                                    onClick={() => handleCopyUrl(room.roomUrl!, room.id)}
                                  >
                                    {copiedId === room.id ? (
                                      <CheckCircle2 className="size-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="size-3" />
                                    )}
                                    <span className="ml-1 hidden sm:inline">
                                      {copiedId === room.id ? "Copied" : "Copy"}
                                    </span>
                                  </Button>
                                  <a
                                    href={room.roomUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 h-7 px-2 text-[10px] text-[#9a9a9a] hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
                                  >
                                    <ExternalLink className="size-3" />
                                    <span className="hidden sm:inline">Open</span>
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] text-[#9a9a9a] hover:text-yellow-400 hover:bg-yellow-400/10"
                                    disabled={actionLoading === room.id}
                                    onClick={() => handleCreateRoom(room.id, "regenerate")}
                                  >
                                    <RefreshCw
                                      className={`size-3 ${actionLoading === room.id ? "animate-spin" : ""}`}
                                    />
                                    <span className="ml-1 hidden sm:inline">Regen</span>
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-3 text-[10px] text-[#c9a96e] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10"
                                  disabled={actionLoading === room.id}
                                  onClick={() => handleCreateRoom(room.id)}
                                >
                                  <Video
                                    className={`size-3 mr-1 ${actionLoading === room.id ? "animate-pulse" : ""}`}
                                  />
                                  {actionLoading === room.id ? "Creating..." : "Create Room"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 max-h-[70vh] overflow-y-auto">
                {filteredRooms.map((room, i) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="bg-[#111]/50 border border-white/[0.04] rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[#f0eee9] text-sm font-medium truncate">{room.name}</p>
                        <p className="text-body-cinematic text-xs truncate text-[#7a7a7a]">{room.email}</p>
                      </div>
                      {room.roomUrl ? (
                        <Badge variant="outline" className="bg-emerald-400/10 border-emerald-400/20 text-emerald-400 text-[10px] shrink-0">
                          <CheckCircle2 className="size-2.5 mr-1" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-400/10 border-yellow-400/20 text-yellow-400 text-[10px] shrink-0">
                          <AlertCircle className="size-2.5 mr-1" />
                          No room
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-body-cinematic flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-[#555]" />
                        {room.duration}min
                      </span>
                      {room.scheduledAt && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3 text-[#555]" />
                          {formatDateTime(room.scheduledAt)}
                        </span>
                      )}
                      <span className="text-[#c9a96e]">{formatPrice(room.price)}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] flex-wrap">
                      {room.roomUrl ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] text-[#9a9a9a] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10"
                            onClick={() => handleCopyUrl(room.roomUrl!, room.id)}
                          >
                            {copiedId === room.id ? (
                              <CheckCircle2 className="size-3 text-emerald-400 mr-1" />
                            ) : (
                              <Copy className="size-3 mr-1" />
                            )}
                            {copiedId === room.id ? "Copied!" : "Copy Link"}
                          </Button>
                          <a
                            href={room.roomUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 h-7 px-2 text-[10px] text-[#9a9a9a] hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
                          >
                            <ExternalLink className="size-3" />
                            Open
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] text-[#9a9a9a] hover:text-yellow-400 hover:bg-yellow-400/10"
                            disabled={actionLoading === room.id}
                            onClick={() => handleCreateRoom(room.id, "regenerate")}
                          >
                            <RefreshCw className={`size-3 mr-1 ${actionLoading === room.id ? "animate-spin" : ""}`} />
                            Regen
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-[10px] text-[#c9a96e] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10"
                          disabled={actionLoading === room.id}
                          onClick={() => handleCreateRoom(room.id)}
                        >
                          <Video className={`size-3 mr-1 ${actionLoading === room.id ? "animate-pulse" : ""}`} />
                          {actionLoading === room.id ? "Creating..." : "Create Room"}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

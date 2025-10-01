import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
	Music,
	Image as ImageIcon,
	Video as VideoIcon,
	Loader2,
	UploadIcon,
	ListOrdered,
	Save,
} from "lucide-react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import useUploadStore from "../store/use-upload-store";
import ModalUpload from "@/components/modal-upload";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSelectionGroups, fetchSelectionGroupById, createSelectionGroup, updateSelectionGroup } from "@/hooks/use-selection-groups";
import { useSelectionStore } from "@/store/use-selection-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import useStore from "../store/use-store";
import { toast } from "sonner";

export const Uploads = () => {
	const { setShowUploadModal, uploads, pendingUploads, activeUploads } =
		useUploadStore();
	const { data: groups, isLoading: loadingGroups } = useSelectionGroups();
	const { setActiveGroup, activeGroup } = useSelectionStore();
	const { playerRef, fps } = useStore();
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();

	const [saveOpen, setSaveOpen] = useState(false);
	const [saveName, setSaveName] = useState<string>("");

	const uploadBtnRef = useRef<HTMLButtonElement | null>(null);
	useEffect(() => {
		uploadBtnRef.current?.focus();
	}, []);

	// per-item downloading progress when adding to timeline
	const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
	const [progressByKey, setProgressByKey] = useState<Record<string, number>>({});

	// Group completed uploads by type
	const videos = uploads.filter(
		(upload) => upload.type?.startsWith("video/") || upload.type === "video",
	);
	const images = uploads.filter(
		(upload) => upload.type?.startsWith("image/") || upload.type === "image",
	);
	const audios = uploads.filter(
		(upload) => upload.type?.startsWith("audio/") || upload.type === "audio",
	);

	async function downloadWithProgress(url: string, onProgress: (pct: number) => void): Promise<string> {
		const res = await fetch(url);
		if (!res.ok || !res.body) {
			throw new Error("Failed to fetch media");
		}
		const contentLengthHeader = res.headers.get("Content-Length");
		const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
		const reader = res.body.getReader();
		const chunks: Uint8Array[] = [];
		let received = 0;
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (value) {
					chunks.push(value);
					received += value.length;
					if (total > 0) {
						onProgress(Math.min(99, Math.round((received / total) * 100)));
					} else {
						// No length header; emit a conservative ramp up
						onProgress(Math.min(95, Math.round(received / 500000)));
					}
				}
			}
		} finally {
			try { reader.releaseLock?.(); } catch {}
		}
		onProgress(100);
		const blob = new Blob(chunks, { type: res.headers.get("Content-Type") || "video/mp4" });
		const blobUrl = URL.createObjectURL(blob);
		return blobUrl;
	}

	const handleAddVideoAfterDownload = async (video: any, itemKey: string) => {
		try {
			const srcVideo = video.metadata?.uploadedUrl || video.url;
			setDownloadingKey(itemKey);
			setProgressByKey((s) => ({ ...s, [itemKey]: 0 }));
			const blobUrl = await downloadWithProgress(srcVideo, (pct) => {
				setProgressByKey((s) => ({ ...s, [itemKey]: pct }));
			});

			dispatch(ADD_VIDEO, {
				payload: {
					id: generateId(),
					details: {
						src: blobUrl,
					},
					metadata: {
						previewUrl:
							"https://cdn.designcombo.dev/caption_previews/static_preset1.webp",
					},
				},
				options: {
					resourceId: "main",
					scaleMode: "fit",
				},
			});
		} catch (e: any) {
			toast.error(e?.message ?? "Failed to add video");
		} finally {
			setTimeout(() => {
				setDownloadingKey((k) => (k === itemKey ? null : k));
			}, 300);
		}
	};

	const handleAddImage = (image: any) => {
		const srcImage = image.metadata?.uploadedUrl || image.url;

		dispatch(ADD_IMAGE, {
			payload: {
				id: generateId(),
				type: "image",
				display: {
					from: 0,
					to: 5000,
				},
				details: {
					src: srcImage,
				},
				metadata: {},
			},
			options: {},
		});
	};

	const handleAddAudio = (audio: any) => {
		const srcAudio = audio.metadata?.uploadedUrl || audio.url;
		dispatch(ADD_AUDIO, {
			payload: {
				id: generateId(),
				type: "audio",
				details: {
					src: srcAudio,
				},
				metadata: {},
			},
			options: {},
		});
	};

	const UploadPrompt = () => (
		<div className="flex flex-col px-4 gap-2">
			<Button ref={uploadBtnRef} className="w-full cursor-pointer" onClick={() => setShowUploadModal(true)}>
				<UploadIcon className="w-4 h-4" />
				<span className="ml-2">Upload</span>
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button variant="secondary" className="w-full">
						<ListOrdered className="w-4 h-4" />
						<span className="ml-2">Selection groups</span>
					</Button>
				</DialogTrigger>
				<DialogContent
					className="sm:max-w-md"
					forceMount
					onOpenAutoFocus={(e) => e.preventDefault()}
					onInteractOutside={(e) => e.preventDefault()}
					onPointerDownOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<DialogHeader>
						<DialogTitle>Selection groups</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						{loadingGroups && (
							<div className="text-sm text-muted-foreground">Loading...</div>
						)}
						{!loadingGroups && (groups?.length ?? 0) === 0 && (
							<div className="text-sm text-muted-foreground">No groups found</div>
						)}
						{(groups ?? []).map((g) => (
							<Button
								key={g.id}
								variant="ghost"
								onClick={async () => {
									try {
										const full = await fetchSelectionGroupById(g.id);
										setActiveGroup(full);
										// Seek to earliest timeframe start
										const framesArr = Object.values(full.timeframes);
										if (framesArr.length > 0 && playerRef?.current) {
											const first = framesArr.sort((a, b) => a.start - b.start)[0];
											const frame = Math.max(0, Math.round(first.start * fps));
											playerRef.current.pause?.();
											playerRef.current.seekTo(frame);
										}
										toast.success(`Loaded selection group: ${full.name}`);
										setOpen(false);
									} catch (e: any) {
										toast.error(e?.message ?? "Failed to load group");
									}
								}}
							>
								{g.name}
							</Button>
						))}
					</div>
				</DialogContent>
			</Dialog>
			{activeGroup && (
				<Button
					variant="outline"
					className="w-full"
					onClick={() => {
						setSaveName(activeGroup?.name ?? "");
						setSaveOpen(true);
					}}
				>
					<Save className="w-4 h-4" />
					<span className="ml-2">Save selection group</span>
				</Button>
			)}

			{/* Save Dialog */}
			<Dialog open={saveOpen} onOpenChange={setSaveOpen}>
				<DialogContent
					className="sm:max-w-md"
				>
					<DialogHeader>
						<DialogTitle>Save selection group</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-3">
						<div className="relative w-full">
							<Input
								type="text"
								autoFocus
								className="h-9"
								placeholder="Group name"
								value={saveName}
								onChange={(e) => setSaveName(e.target.value)}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
							<Button
								onClick={async () => {
									try {
										if (!saveName || !saveName.trim()) {
											toast.error("Please enter a name");
											return;
										}

										// Build timeframes from current activeGroup if present
										const timeframes = activeGroup?.timeframes ?? {};
										if (activeGroup?.id) {
											await updateSelectionGroup(activeGroup.id, { name: saveName.trim(), timeframes });
											await queryClient.invalidateQueries({ queryKey: ["selection-groups"] });
											toast.success("Selection group updated");
										} else {
											const { id } = await createSelectionGroup({ name: saveName.trim(), timeframes });
											await queryClient.invalidateQueries({ queryKey: ["selection-groups"] });
											toast.success("Selection group created");
										}
										setSaveOpen(false);
									} catch (e: any) {
										toast.error(e?.message ?? "Failed to save group");
									}
							}}
						>
							Save
						</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Your uploads
			</div>
			<ModalUpload />
			<UploadPrompt />

			{/* Uploads in Progress Section */}
			{(pendingUploads.length > 0 || activeUploads.length > 0) && (
				<div className="p-4">
					<div className="font-medium text-sm mb-2 flex items-center gap-2">
						<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
						Uploads in Progress
					</div>
					<div className="flex flex-col gap-2">
						{pendingUploads.map((upload) => (
							<div key={upload.id} className="flex items-center gap-2">
								<span className="truncate text-xs flex-1">
									{upload.file?.name || upload.url || "Unknown"}
								</span>
								<span className="text-xs text-muted-foreground">Pending</span>
							</div>
						))}
						{activeUploads.map((upload) => (
							<div key={upload.id} className="flex items-center gap-2">
								<span className="truncate text-xs flex-1">
									{upload.file?.name || upload.url || "Unknown"}
								</span>
								<div className="flex items-center gap-1">
									<Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
									<span className="text-xs">{upload.progress ?? 0}%</span>
									<span className="text-xs text-muted-foreground ml-2">
										{upload.status}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="flex flex-col gap-10 p-4">
				{/* Videos Section */}
				{videos.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<VideoIcon className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">Videos</span>
						</div>
						<ScrollArea className="max-h-32">
							<div className="grid grid-cols-3 gap-2 max-w-full">
								{videos.map((video, idx) => {
									const itemKey = String(
										video.id || video.filePath || video.file?.name || idx,
									);
									const isDownloading = downloadingKey === itemKey;
									const pct = progressByKey[itemKey] ?? 0;
									return (
										<div
											className="flex items-center gap-2 flex-col w-full"
											key={itemKey}
										>
											<Card
												className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer"
												onClick={() => {
													if (isDownloading) return;
													handleAddVideoAfterDownload(video, itemKey);
												}}
												aria-busy={isDownloading}
												style={{ pointerEvents: isDownloading ? "none" : undefined }}
											>
												{isDownloading ? (
													<div className="absolute inset-0 flex items-center justify-center bg-background/60">
														<Loader2 className="w-4 h-4 animate-spin mr-1 text-muted-foreground" />
														<span className="text-xs font-medium">{pct}%</span>
													</div>
												) : (
													<VideoIcon className="w-8 h-8 text-muted-foreground" />
												)}
											</Card>
											<div className="text-xs text-muted-foreground truncate w-full text-center">
												{video.file?.name || video.url || "Video"}
											</div>
										</div>
									);
								})}
							</div>
						</ScrollArea>
					</div>
				)}

				{/* Images Section */}
				{images.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<ImageIcon className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">Images</span>
						</div>
						<ScrollArea className="max-h-32">
							<div className="grid grid-cols-3 gap-2 max-w-full">
								{images.map((image, idx) => (
									<div
										className="flex items-center gap-2 flex-col w-full"
										key={image.id || idx}
									>
										<Card
											className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer"
											onClick={() => handleAddImage(image)}
										>
											<ImageIcon className="w-8 h-8 text-muted-foreground" />
										</Card>
										<div className="text-xs text-muted-foreground truncate w-full text-center">
											{image.file?.name || image.url || "Image"}
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					</div>
				)}

				{/* Audios Section */}
				{audios.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Music className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">Audios</span>
						</div>
						<ScrollArea className="max-h-32">
							<div className="grid grid-cols-3 gap-2 max-w-full">
								{audios.map((audio, idx) => (
									<div
										className="flex items-center gap-2 flex-col w-full"
										key={audio.id || idx}
									>
										<Card
											className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer"
											onClick={() => handleAddAudio(audio)}
										>
											<Music className="w-8 h-8 text-muted-foreground" />
										</Card>
										<div className="text-xs text-muted-foreground truncate w-full text-center">
											{audio.file?.name || audio.url || "Audio"}
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					</div>
				)}
			</div>
		</div>
	);
};

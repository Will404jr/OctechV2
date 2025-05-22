"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ImageIcon, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import AdCarousel from "./AdCarousel"
import type { Ad } from "./Ad"
import { QueueSpinner } from "@/components/queue-spinner"
import { ProtectedRoute } from "@/components/ProtectedRoute"

const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30MB

const validateFileSize = (file: File) => {
  if (file.size > MAX_FILE_SIZE) {
    return "File size should not exceed 30MB"
  }
  return true
}

export default function DisplayAdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    fetchAds()
  }, [])

  const fetchAds = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/hospital/ads")
      if (response.ok) {
        const data: Ad[] = await response.json()
        setAds(data)
      }
    } catch (error) {
      console.error("Error fetching ads:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: any) => {
    try {
      const formData = new FormData()
      formData.append("name", data.name)
      if (data.image && data.image.length > 0) {
        formData.append("image", data.image[0])
      }

      const response = await fetch("/api/hospital/ads", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const updatedAd: Ad = await response.json()
        setAds((prevAds) => [updatedAd, ...prevAds])
        reset()
        setIsDialogOpen(false)
      } else {
        const errorData = await response.json()
        console.error("Error creating ad:", errorData.error)
        // You might want to show this error to the user
      }
    } catch (error) {
      console.error("Error creating ad:", error)
      // You might want to show this error to the user
    }
  }

  const deleteAd = async (id: string) => {
    try {
      const response = await fetch(`/api/hospital/ads/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setAds((prevAds) => prevAds.filter((ad) => ad._id !== id))
      } else {
        console.error("Failed to delete ad")
        // You might want to show this error to the user
      }
    } catch (error) {
      console.error("Error deleting ad:", error)
      // You might want to show this error to the user
    }
  }

  return (
    <ProtectedRoute requiredPermission="Ads">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">Display Ads</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#0e4480]">
                <Plus className="mr-2 h-4 w-4" />
                Add Advertisement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Advertisement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" encType="multipart/form-data">
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Ad Name</Label>
                    <Input id="name" {...register("name")} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="image">Image</Label>
                    <Input
                      id="image"
                      type="file"
                      {...register("image", {
                        required: true,
                        validate: {
                          fileSize: (value) => validateFileSize(value[0]),
                        },
                      })}
                      accept="image/*"
                    />
                    {errors.image && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.image.type === "fileSize" ? "File size should not exceed 4MB" : "Image is required"}
                      </p>
                    )}
                  </div>
                </div>
                <Button type="submit" className="w-full bg-[#0e4480]">
                  Create Advertisement
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
          </div>
        ) : (
          <>
            <AdCarousel ads={ads} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad: Ad) => (
                <Card key={ad._id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{ad.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAd(ad._id)}
                      aria-label={`Delete ${ad.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                      {ad.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ad.image || "/placeholder.svg"}
                          alt={ad.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>
                        <strong>Added:</strong> {new Date(ad.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}

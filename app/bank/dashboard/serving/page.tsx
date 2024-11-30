"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward } from "lucide-react";

export default function ServingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Serving Station</h2>
        <p className="text-muted-foreground">Manage your current serving queue</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">A001</div>
            <p className="text-sm text-muted-foreground mt-2">Service: Deposit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-sm text-muted-foreground">People waiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Serving Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5:30</div>
            <p className="text-sm text-muted-foreground">Minutes per customer</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button size="lg" className="w-full">
          <Play className="mr-2 h-4 w-4" />
          Start Serving
        </Button>
        <Button size="lg" variant="outline" className="w-full">
          <Pause className="mr-2 h-4 w-4" />
          Pause
        </Button>
        <Button size="lg" variant="secondary" className="w-full">
          <SkipForward className="mr-2 h-4 w-4" />
          Next Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
              <span className="font-semibold">A002</span>
              <span className="text-muted-foreground">Withdrawal</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="font-semibold">A003</span>
              <span className="text-muted-foreground">Account Opening</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="font-semibold">A004</span>
              <span className="text-muted-foreground">Deposit</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
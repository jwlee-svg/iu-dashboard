export type ShippingProjectStatus = 'preparing' | 'shipping' | 'completed' | 'pending'
export type ShippingTargetStatus = 'completed' | 'not_sent' | 'rejected' | 'pending' | 'special'
export type TargetCategory = 'influencer' | 'celebrity'

export interface ShippingProject {
  id: string
  name: string
  productComposition: string
  scheduledDate: string
  manager: string
  memo: string
  smsTemplate: string
  smsSendDate: string
  createdAt: string
  status: ShippingProjectStatus
}

export interface ShippingTarget {
  id: string
  projectId: string
  creatorId?: string          // links to Creator DB
  name: string
  category: TargetCategory
  channelName: string
  mcn: string
  mcnManager: string
  mcnManagerEmail: string
  phone: string
  address: string
  trackingNumber: string
  shippingStatus: ShippingTargetStatus
  specialNote: string
  smsSent: boolean
  smsSentDate: string
  memo: string
}

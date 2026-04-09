
-- Create ticket_replies table
CREATE TABLE public.ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Ticket owners can view replies on their tickets
CREATE POLICY "Users can view replies on own tickets"
ON public.ticket_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = ticket_replies.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Users can create replies on their own tickets
CREATE POLICY "Users can reply to own tickets"
ON public.ticket_replies
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = ticket_replies.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Admins can view all replies
CREATE POLICY "Admins can view all replies"
ON public.ticket_replies
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can create replies on any ticket
CREATE POLICY "Admins can reply to any ticket"
ON public.ticket_replies
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

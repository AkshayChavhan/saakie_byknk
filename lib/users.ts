import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient()

interface CreateUserData {
  clerkId: string;
  email: string;
  name: string | null;
  phone: string | null;
  imageUrl: string | null;
  profileImageUrl: string | null;
  gender: string | null;
  role: UserRole;
}

export async function createUser(data: CreateUserData) {
  try {
    const user = await prisma.user.create({
      data
    });
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

interface UpdateUserData {
  email: string;
  name: string | null;
  phone: string | null;
  imageUrl: string | null;
  profileImageUrl: string | null;
  gender: string | null;
}

export async function updateUser(clerkId: string, data: UpdateUserData) {
  try {
    const user = await prisma.user.update({
      where: { clerkId },
      data
    });
    return user;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function deleteUser(clerkId: string) {
  try {
    // Delete related records first (due to foreign key constraints)
    const user = await prisma.user.findUnique({
      where: { clerkId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Delete cart items, cart, wishlist items, wishlist, etc.
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } }),
      prisma.cart.deleteMany({ where: { userId: user.id } }),
      prisma.wishlistItem.deleteMany({ where: { wishlist: { userId: user.id } } }),
      prisma.wishlist.deleteMany({ where: { userId: user.id } }),
      prisma.review.deleteMany({ where: { userId: user.id } }),
      prisma.order.deleteMany({ where: { userId: user.id } }),
      prisma.address.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { clerkId } })
    ]);
    
    console.log('User and related data deleted successfully');
    return { success: true, clerkId };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}
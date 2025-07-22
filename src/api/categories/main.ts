import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processCategoriesListResponse, processCategoryResponse } from './processors'
import { GetCategoriesListAPI, GetCategoryAPI } from './types'

export const getCategoriesListAPI: GetCategoriesListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetCategoriesListAPI['response']>>(ENDPOINTS.getCategoriesList)
  const processedResponse = processCategoriesListResponse(data)
  return processedResponse
}

export const getCategoryAPI: GetCategoryAPI['api'] = async (args) => {
  console.log('Fetching category with ID:', `${ENDPOINTS.getCategory}/${args.id}`)

  const { data } = await axiosInstance.get<APIResponse<GetCategoryAPI['response']>>(
    `${ENDPOINTS.getCategory}/${args.id}`
  )

  const processedResponse = processCategoryResponse(data)
  return processedResponse
}
